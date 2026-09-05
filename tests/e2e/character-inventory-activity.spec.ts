import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";
import postgres from "postgres";
import {
	type CatalogueJourneyFixture,
	cleanupCatalogueJourneyFixture,
	prepareCatalogueJourneyFixture,
} from "./catalogue-journey-fixture.js";
import { openInventoryTab } from "./character-detail-helpers.js";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
let catalogueFixture: CatalogueJourneyFixture | null = null;

test.setTimeout(90_000);

test.beforeAll(async () => {
	if (!sql) throw new Error("DATABASE_URL is required for character activity e2e tests.");
	catalogueFixture = await prepareCatalogueJourneyFixture(sql);
});

test.afterAll(async () => {
	try {
		if (sql) await cleanupCatalogueJourneyFixture(sql);
	} finally {
		await sql?.end();
	}
});

test("records, filters, paginates, and persists personal inventory activity", async ({
	browser,
	page,
}) => {
	const fixture = requireCatalogueFixture();
	let previewRequests = 0;
	await page.route("**/api/characters/*/treasury/preview/*", async (route) => {
		previewRequests += 1;
		await route.continue();
	});

	await page.goto("/");
	const characterName = `Activity Hero ${Date.now()}`;
	const bladeName = fixture.mundaneName;
	const potionName = `Activity Potion ${Date.now()}`;
	await createCharacter(page, characterName, "Fighter");
	const characterId = characterIdFromPage(page);
	await openInventoryTab(page);

	const recentActivity = page.getByTestId("recent-activity");
	await expect(recentActivity.getByText("No activity yet", { exact: true })).toBeVisible();

	await addCatalogueItem(page, fixture.searchQuery, bladeName);
	await addCustomItem(page, potionName, "Potion");

	const historyAfterAdds = await getHistory(page, characterId);
	expect(historyAfterAdds.total).toBe(2);
	await openItemDetails(page, bladeName);
	await itemDetails(page, bladeName).getByRole("button", { name: "Edit", exact: true }).click();
	const noOpEditDialog = page.getByRole("dialog", { name: "Edit personal item" });
	await noOpEditDialog.getByRole("button", { name: "Save item", exact: true }).click();
	await expect(noOpEditDialog).toBeHidden();
	await page.getByRole("button", { name: `Close ${bladeName} details`, exact: true }).click();
	expect((await getHistory(page, characterId)).total).toBe(historyAfterAdds.total);

	await openItemDetails(page, potionName);
	const potionDetails = itemDetails(page, potionName);
	await potionDetails.getByRole("button", { name: "Edit", exact: true }).click();
	const editDialog = page.getByRole("dialog", { name: "Edit personal item" });
	await editDialog.getByLabel("Quantity").fill("2");
	await editDialog.getByLabel("Notes").fill("Found in the old keep");
	await editDialog.getByRole("button", { name: "Save item", exact: true }).click();
	await expect(editDialog).toBeHidden();
	await expect(page.getByText("Found in the old keep", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: `Close ${potionName} details`, exact: true }).click();

	await openItemDetails(page, bladeName);
	const bladeDetails = itemDetails(page, bladeName);
	await bladeDetails.getByRole("button", { name: "Equip", exact: true }).click();
	await expect(bladeDetails.getByRole("button", { name: "Unequip", exact: true })).toBeVisible();
	await bladeDetails
		.getByRole("button", { name: `Close ${bladeName} details`, exact: true })
		.click();

	await openItemDetails(page, bladeName);
	await itemDetails(page, bladeName).getByRole("button", { name: "Unequip", exact: true }).click();
	await expect(
		itemDetails(page, bladeName).getByRole("button", { name: "Equip", exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: `Close ${bladeName} details`, exact: true }).click();

	await openItemDetails(page, potionName);
	await itemDetails(page, potionName).getByRole("button", { name: "Delete", exact: true }).click();
	const deleteDialog = page.getByRole("dialog", { name: "Delete item?" });
	await deleteDialog.getByRole("button", { name: "Delete item", exact: true }).click();
	await expect(page.getByRole("button", { name: `View ${potionName}`, exact: true })).toBeHidden();

	const paginationNames = Array.from(
		{ length: 13 },
		(_, index) => `Pagination Item ${String(index + 1).padStart(2, "0")}`,
	);
	for (const name of paginationNames) {
		await createItemThroughApi(page, characterId, name);
	}

	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	let addDialog = page.getByRole("dialog", { name: "Add funds" });
	await expect(addDialog.getByText("Preview", { exact: true })).toBeVisible();
	await addDialog.getByLabel("Platinum pieces (PP)").fill("1");
	await addDialog.getByLabel("Note (optional)").fill("Dismissed preview");
	await expect(addDialog.getByText("After change", { exact: true })).toBeVisible();
	await addDialog.getByRole("button", { name: "Cancel", exact: true }).click();
	await expect(addDialog).toBeHidden();
	expect((await getHistory(page, characterId)).total).toBe(19);

	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	addDialog = page.getByRole("dialog", { name: "Add funds" });
	await expect(addDialog.getByText("Preview", { exact: true })).toBeVisible();
	await addDialog.getByLabel("Platinum pieces (PP)").fill("2");
	await addDialog.getByLabel("Note (optional)").fill("  Reward from the guild  ");
	await expect(addDialog.getByText("After change", { exact: true })).toBeVisible();
	await expect(addDialog.getByText("0.00 GP -> 20.00 GP", { exact: true })).toBeVisible();
	await addDialog.getByRole("button", { name: "Add funds", exact: true }).click();
	await expect(addDialog).toBeHidden();
	await expect(recentActivity.getByText("Added 2 PP", { exact: true })).toBeVisible();

	await openActivityDrawer(page);
	let activityDrawer = page.getByRole("dialog", { name: "Inventory activity" });
	await expect(activityDrawer.getByText("Added 2 PP", { exact: true })).toBeVisible();
	await expect(activityDrawer.getByText(/Reward from the guild/)).toBeVisible();
	await closeActivityDrawer(activityDrawer);

	await page.getByRole("button", { name: "Spend", exact: true }).click();
	const spendDialog = page.getByRole("dialog", { name: "Spend funds" });
	await expect(spendDialog.getByText("Preview", { exact: true })).toBeVisible();
	await spendDialog.getByLabel("Gold pieces (GP)").fill("15");
	await expect(spendDialog.getByText("Available: 2", { exact: true })).toBeVisible();
	await expect(spendDialog.getByText("After change", { exact: true })).toBeVisible();
	await expect(spendDialog.getByText("20.00 GP -> 5.00 GP", { exact: true })).toBeVisible();
	await spendDialog.getByLabel("Note (optional)").fill("  Bought climbing gear  ");
	await spendDialog.getByRole("button", { name: "Spend", exact: true }).click();
	await expect(spendDialog).toBeHidden();
	await expect(recentActivity.getByText("Spent 15 GP", { exact: true })).toBeVisible();
	await expect(recentActivity.getByText(/Bought climbing gear/)).toBeVisible();

	const historyBeforeRejected = await getHistory(page, characterId);
	expect(historyBeforeRejected.total).toBe(21);

	const treasury = await getTreasury(page, characterId);
	const rejectedSpend = await page.request.post(`/api/characters/${characterId}/treasury/spend`, {
		data: {
			amount: { denomination: "gp", amount: 100 },
			expectedPrevious: treasury.treasury.balances,
		},
	});
	expect(rejectedSpend.status()).toBe(409);

	const addPreview = await page.request.post(
		`/api/characters/${characterId}/treasury/preview/add`,
		{ data: { delta: { cp: 1, sp: 0, gp: 0, pp: 0 } } },
	);
	expect(addPreview.status()).toBe(200);
	const spendPreview = await page.request.post(
		`/api/characters/${characterId}/treasury/preview/spend`,
		{ data: { amount: { denomination: "gp", amount: 1 } } },
	);
	expect(spendPreview.status()).toBe(200);
	const historyAfterRejected = await getHistory(page, characterId);
	expect(historyAfterRejected.total).toBe(historyBeforeRejected.total);
	expect(previewRequests).toBe(0);

	await page.getByRole("button", { name: "Spend", exact: true }).click();
	const overspendDialog = page.getByRole("dialog", { name: "Spend funds" });
	await overspendDialog.getByLabel("Gold pieces (GP)").fill("100");
	await expect(overspendDialog.getByText("Insufficient funds", { exact: true })).toBeVisible();
	await expect(overspendDialog.getByRole("button", { name: "Spend", exact: true })).toBeDisabled();
	await overspendDialog.getByRole("button", { name: "Cancel", exact: true }).click();

	await openActivityDrawer(page);
	activityDrawer = page.getByRole("dialog", { name: "Inventory activity" });
	const initialActivityEntries = await readActivityEntries(activityDrawer);
	expect(initialActivityEntries[0]).toContain("Spent 15 GP");
	expect(initialActivityEntries).toHaveLength(20);

	await selectActivityFilter(activityDrawer, "Items");
	await expect(activityDrawer.getByText("Spent 15 GP", { exact: true })).toBeHidden();
	await expect(activityDrawer.getByText(`Added ${bladeName}`, { exact: true })).toBeVisible();
	await expect(activityDrawer.getByText(`Removed ${potionName}`, { exact: true })).toBeVisible();
	await expect(activityDrawer.getByText("Added Pagination Item 01", { exact: true })).toBeVisible();
	await expect(activityDrawer.getByRole("button", { name: "Load more activity" })).toBeHidden();

	await selectActivityFilter(activityDrawer, "Treasury");
	await expect(activityDrawer.getByText("Spent 15 GP", { exact: true })).toBeVisible();
	await expect(activityDrawer.getByText(`Added ${bladeName}`, { exact: true })).toBeHidden();
	await expect(activityDrawer.getByText("Added 2 PP", { exact: true })).toBeVisible();
	await expect(activityDrawer.getByText("Balance: 2 PP -> 5 GP", { exact: true })).toBeVisible();
	await expect(activityDrawer.getByText(/Bought climbing gear/)).toBeVisible();
	await expect(activityDrawer.getByRole("button", { name: "Load more activity" })).toBeHidden();
	expect(await readActivityEntries(activityDrawer)).toHaveLength(2);

	await selectActivityFilter(activityDrawer, "All");
	await expect(activityDrawer.getByRole("button", { name: "Load more activity" })).toBeVisible();
	expect(await readActivityEntries(activityDrawer)).toHaveLength(20);
	await activityDrawer.getByRole("button", { name: "Load more activity" }).click();
	await expect(activityDrawer.getByRole("button", { name: "Load more activity" })).toBeHidden();
	const allActivityEntries = await readActivityEntries(activityDrawer);
	expect(allActivityEntries).toHaveLength(21);
	expect(new Set(allActivityEntries).size).toBe(allActivityEntries.length);
	const expectedNewestFirst = [
		"Spent 15 GP",
		"Added 2 PP",
		...[...paginationNames].reverse().map((name) => `Added ${name}`),
		`Removed ${potionName}`,
		`Unequipped ${bladeName}`,
		`Equipped ${bladeName}`,
		`Updated ${potionName}`,
		`Added ${potionName}`,
		`Added ${bladeName}`,
	];
	for (const [index, summary] of expectedNewestFirst.entries()) {
		expect(allActivityEntries[index]).toContain(summary);
	}
	await expect(activityDrawer.getByText(`Unequipped ${bladeName}`, { exact: true })).toBeVisible();
	await expect(activityDrawer.getByText(`Updated ${potionName}`, { exact: true })).toBeVisible();
	await expect(activityDrawer.getByText(`Removed ${potionName}`, { exact: true })).toBeVisible();
	const removedPotionEntry = activityDrawer
		.locator(".character-activity-entry")
		.filter({ hasText: `Removed ${potionName}` });
	await expect(removedPotionEntry.getByText("x2", { exact: true })).toBeVisible();
	await expect(removedPotionEntry.getByText(/Found in the old keep/)).toBeVisible();
	await closeActivityDrawer(activityDrawer);

	await page.reload();
	await openInventoryTab(page);
	await expect(page.getByRole("heading", { name: characterName })).toBeVisible();
	await expect(page.getByTestId("treasury-total")).toContainText("5.00 GP");
	await expect(
		page.getByTestId("recent-activity").getByText("Spent 15 GP", { exact: true }),
	).toBeVisible();

	await page.getByText("Back to characters", { exact: true }).click();
	const secondCharacterName = `Activity Second ${Date.now()}`;
	await createCharacter(page, secondCharacterName, "Wizard");
	const secondCharacterId = characterIdFromPage(page);
	await openInventoryTab(page);
	await expect(
		page.getByTestId("recent-activity").getByText("No activity yet", { exact: true }),
	).toBeVisible();
	const secondHistory = await getHistory(page, secondCharacterId);
	expect(secondHistory.total).toBe(0);
	await openActivityDrawer(page);
	activityDrawer = page.getByRole("dialog", { name: "Inventory activity" });
	await expect(activityDrawer.getByText("No activity yet", { exact: true })).toBeVisible();

	await assertCharacterIsNotVisibleToAnotherUser(browser, characterId);
});

async function createCharacter(page: Page, name: string, className: string) {
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill(name);
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: className, exact: true }).click();
	await page.getByRole("button", { name: "Create character", exact: true }).click();
	await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function addCustomItem(page: Page, name: string, type: string) {
	await page
		.getByTestId("personal-inventory")
		.getByRole("button", { name: "Add item", exact: true })
		.click();
	const dialog = page.getByRole("dialog", { name: "Add personal item" });
	await dialog.getByLabel("Name").fill(name);
	await dialog.getByRole("combobox", { name: "Type" }).click();
	await page.getByRole("option", { name: type, exact: true }).click();
	await dialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole("button", { name: `View ${name}`, exact: true })).toBeVisible();
}

async function addCatalogueItem(page: Page, searchQuery: string, name: string) {
	await page
		.getByTestId("personal-inventory")
		.getByRole("button", { name: "Add item", exact: true })
		.click();
	const dialog = page.getByRole("dialog", { name: "Add personal item" });
	await dialog.getByLabel("Search SRD catalogue").fill(searchQuery);
	const result = dialog.getByRole("button", { name: `Select catalogue item ${name}` });
	await expect(result).toBeVisible();
	await result.click();
	await expect(dialog.getByLabel("Name")).toHaveValue(name);
	await dialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole("button", { name: `View ${name}`, exact: true })).toBeVisible();
}

function requireCatalogueFixture() {
	if (!catalogueFixture) throw new Error("Catalogue fixture was not prepared before navigation.");
	return catalogueFixture;
}

async function openItemDetails(page: Page, name: string) {
	await page.getByRole("button", { name: `View ${name}`, exact: true }).click();
	await expect(itemDetails(page, name)).toBeVisible();
}

function itemDetails(page: Page, name: string) {
	return page
		.getByRole("dialog")
		.filter({ has: page.getByRole("button", { name: `Close ${name} details`, exact: true }) });
}

async function createItemThroughApi(page: Page, characterId: string, name: string) {
	const response = await page.request.post(`/api/characters/${characterId}/items`, {
		data: {
			category: "Pagination",
			catalogueItemId: null,
			description: null,
			estimatedValue: null,
			name,
			notes: null,
			properties: {},
			rarity: null,
			quantity: 1,
			thumbnailUrl: null,
			type: "misc",
			weight: null,
		},
	});
	expect(response.status()).toBe(201);
}

async function getHistory(page: Page, characterId: string) {
	const response = await page.request.get(`/api/characters/${characterId}/history?limit=100`);
	expect(response.ok()).toBe(true);
	return (await response.json()) as { entries: unknown[]; total: number };
}

async function getTreasury(page: Page, characterId: string) {
	const response = await page.request.get(`/api/characters/${characterId}/treasury`);
	expect(response.ok()).toBe(true);
	return (await response.json()) as {
		treasury: { balances: { cp: number; sp: number; gp: number; pp: number } };
	};
}

async function openActivityDrawer(page: Page) {
	await page.getByRole("button", { name: "View inventory activity" }).click();
	await expect(page.getByRole("dialog", { name: "Inventory activity" })).toBeVisible();
}

async function closeActivityDrawer(drawer: Locator) {
	await drawer.getByRole("button", { name: "Close inventory activity", exact: true }).click();
	await expect(drawer).toBeHidden();
}

async function selectActivityFilter(drawer: Locator, name: "All" | "Items" | "Treasury") {
	await drawer.locator(".character-activity-filter").getByText(name, { exact: true }).click();
	await expect(drawer.getByRole("radio", { name, exact: true })).toBeChecked();
}

async function readActivityEntries(drawer: Locator) {
	return drawer
		.locator(".character-activity-entry")
		.evaluateAll((entries) =>
			entries.map((entry) => entry.textContent?.replace(/\s+/g, " ").trim() ?? ""),
		);
}

function characterIdFromPage(page: Page) {
	return new URL(page.url()).pathname.split("/").at(-1) ?? "";
}

async function assertCharacterIsNotVisibleToAnotherUser(browser: Browser, characterId: string) {
	const context = await browser.newContext({ baseURL: process.env.WEB_URL });
	try {
		const page = await context.newPage();
		await page.goto("/");
		const response = await page.request.get(`/api/characters/${characterId}/history`);
		expect(response.status()).toBe(404);
	} finally {
		await context.close();
	}
}
