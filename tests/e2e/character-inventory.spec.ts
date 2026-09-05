import { expect, type Locator, type Page, test } from "@playwright/test";
import postgres from "postgres";
import {
	type CatalogueJourneyFixture,
	cleanupCatalogueJourneyFixture,
	prepareCatalogueJourneyFixture,
} from "./catalogue-journey-fixture.js";
import { openInventoryTab, openSpellsAndAbilitiesTab } from "./character-detail-helpers.js";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
let catalogueFixture: CatalogueJourneyFixture | null = null;

test.beforeAll(async () => {
	if (!sql) throw new Error("DATABASE_URL is required for character inventory e2e tests.");
	catalogueFixture = await prepareCatalogueJourneyFixture(sql);
});

test.afterAll(async () => {
	try {
		if (sql) await cleanupCatalogueJourneyFixture(sql);
	} finally {
		await sql?.end();
	}
});

test("completes the M2 personal inventory journey", async ({ page }) => {
	test.setTimeout(60_000);
	const fixture = requireCatalogueFixture();
	await page.goto("/");
	const firstCharacterName = `A7 Inventory Hero ${Date.now()}`;
	await createCharacter(page, firstCharacterName, "Fighter");
	const firstCharacterUrl = page.url();
	await openInventoryTab(page);
	await expect(page.getByRole("heading", { name: firstCharacterName })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Experience" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
	await expect(page.getByTestId("treasury-total")).toBeVisible();
	const inventory = page.getByTestId("personal-inventory");

	await expect(page.getByText("No personal items yet")).toBeVisible();
	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const addDialog = page.getByRole("dialog", { name: "Add personal item" });
	await expect(addDialog.getByText("Rules 2024")).toBeVisible();
	await addDialog.getByLabel("Search SRD catalogue").fill(fixture.searchQuery);
	const mundaneResult = addDialog.getByRole("button", {
		name: `Select catalogue item ${fixture.mundaneName}`,
	});
	const magicResult = addDialog.getByRole("button", {
		name: `Select catalogue item ${fixture.magicName}`,
	});
	await expect(mundaneResult).toBeVisible();
	await expect(magicResult).toBeVisible();
	await expect(mundaneResult.getByText("Mundane", { exact: true })).toBeVisible();
	await expect(magicResult.getByText("Magic item", { exact: true })).toBeVisible();
	await mundaneResult.click();
	await expect(addDialog.getByLabel("Name")).toHaveValue(fixture.mundaneName);
	await expect(addDialog.getByLabel("Category")).toHaveValue("Weapons");
	await addDialog.getByLabel("Quantity").fill("2");
	await addDialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(page.getByRole("button", { name: `View ${fixture.mundaneName}` })).toBeVisible();
	await expect(addDialog).toBeHidden();

	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const customDialog = page.getByRole("dialog", { name: "Add personal item" });
	await customDialog.getByLabel("Name").fill("Sage's Elixir");
	await selectOption(page, customDialog, "Type", "Potion");
	await selectOption(page, customDialog, "Rarity", "Rare");
	await customDialog.getByLabel("Category").fill("Potions");
	await customDialog.getByLabel("Quantity").fill("3");
	await customDialog.getByLabel("Weight (lb)").fill("0.5");
	await customDialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(page.getByRole("button", { name: "View Sage's Elixir" })).toBeVisible();

	await expect(page.getByText("2 items")).toBeVisible();
	await expect(page.getByRole("button", { name: /Equipment/ })).toContainText("1");
	await expect(page.getByRole("button", { name: /Potion/ })).toContainText("1");
	await expect(page.getByRole("button", { name: /All/ })).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByRole("button", { name: /Equipment/ })).toHaveAttribute(
		"aria-pressed",
		"false",
	);
	await expect(page.getByRole("tab")).toHaveCount(2);
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: "Sage's Elixir" })
			.getByText("Rare", { exact: true }),
	).toBeVisible();
	await expect(page.getByText("x2")).toBeVisible();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: "Sage's Elixir" })
			.getByText("x3", { exact: true }),
	).toBeVisible();
	const equipmentCard = page.getByRole("button", { name: `View ${fixture.mundaneName}` });
	await expect(
		equipmentCard.locator("img").or(equipmentCard.getByLabel("Equipment icon")),
	).toBeVisible();
	await expect(page.getByLabel("Potion icon")).toBeVisible();

	const inventorySearch = page.getByLabel("Search personal inventory");
	await inventorySearch.fill(fixture.inventorySearchQuery);
	await expect(page.getByRole("button", { name: `View ${fixture.mundaneName}` })).toBeVisible();
	await expect(page.getByRole("button", { name: "View Sage's Elixir" })).toBeHidden();
	await inventorySearch.fill("");
	await page.getByRole("button", { name: /Potion/ }).click();
	await expect(page.getByRole("button", { name: /Potion/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(page.getByRole("button", { name: "View Sage's Elixir" })).toBeVisible();
	await expect(page.getByRole("button", { name: `View ${fixture.mundaneName}` })).toBeHidden();
	await page.getByRole("button", { name: /All/ }).click();

	await page.getByRole("button", { name: `View ${fixture.mundaneName}` }).click();
	await expect(page.getByText(`Rules ${fixture.rulesVersion}`)).toBeVisible();
	await page.getByRole("button", { name: "Equip", exact: true }).click();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: fixture.mundaneName })
			.getByText("Equipped", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: `Close ${fixture.mundaneName} details` }).click();
	await page.reload();
	await openInventoryTab(page);
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: fixture.mundaneName })
			.getByText("Equipped"),
	).toBeVisible();

	await page.getByRole("button", { name: `View ${fixture.mundaneName}` }).click();
	await page
		.getByLabel(`${fixture.mundaneName}Equipment`, { exact: true })
		.getByRole("button", { name: "Edit", exact: true })
		.click();
	const editDialog = page.getByRole("dialog", { name: "Edit personal item" });
	await editDialog.getByLabel("Notes").fill("Found in the old keep");
	await editDialog.getByRole("button", { name: "Save item" }).click();
	await expect(editDialog).toBeHidden();
	await expect(page.getByText("Found in the old keep", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: `Close ${fixture.mundaneName} details` }).click();

	await page.route(
		"**/api/catalogue/status",
		async (route) =>
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Catalogue unavailable" }),
			}),
	);
	await page.route(
		"**/api/catalogue/items**",
		async (route) =>
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Catalogue unavailable" }),
			}),
	);
	await page.reload();
	await openInventoryTab(page);
	await expect(page.getByRole("button", { name: `View ${fixture.mundaneName}` })).toBeVisible();
	await page.getByRole("button", { name: `View ${fixture.mundaneName}` }).click();
	await expect(page.getByText(`Rules ${fixture.rulesVersion}`)).toBeVisible();
	await page.getByRole("button", { name: `Close ${fixture.mundaneName} details` }).click();
	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const unavailableDialog = page.getByRole("dialog", { name: "Add personal item" });
	await expect(unavailableDialog.getByText("SRD catalogue unavailable")).toBeVisible();
	await expect(unavailableDialog.getByLabel("Name")).toBeVisible();
	await unavailableDialog.getByRole("button", { name: /Close add item dialog/ }).click();
	await expect(unavailableDialog).toBeHidden();
	await page.unroute("**/api/catalogue/status");
	await page.unroute("**/api/catalogue/items**");

	await page.getByRole("button", { name: `View ${fixture.mundaneName}` }).click();
	await page.getByRole("button", { name: "Unequip", exact: true }).click();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: fixture.mundaneName })
			.getByText("Equipped", { exact: true }),
	).toBeHidden();
	await page.getByRole("button", { name: "Delete", exact: true }).click();
	const deleteDialog = page.getByRole("dialog", { name: "Delete item?" });
	await expect(deleteDialog).toContainText(fixture.mundaneName);
	await deleteDialog.getByRole("button", { name: "Cancel" }).click();
	await page.getByRole("button", { name: "Delete", exact: true }).click();
	await page
		.getByRole("dialog", { name: "Delete item?" })
		.getByRole("button", { name: "Delete item" })
		.click();
	await expect(page.getByRole("button", { name: `View ${fixture.mundaneName}` })).toBeHidden();

	await page.getByText("Back to characters").click();
	const secondCharacterName = `A7 Inventory Second ${Date.now()}`;
	await createCharacter(page, secondCharacterName, "Wizard");
	await openInventoryTab(page);
	await expect(page.getByText("No personal items yet")).toBeVisible();
	await expect(page.getByText(fixture.mundaneName)).toBeHidden();

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(firstCharacterUrl);
	await openInventoryTab(page);
	await expectNoHorizontalOverflow(page);
	await expect(page.getByText("Sage's Elixir")).toBeVisible();
	await page.getByRole("button", { name: "Add item", exact: true }).click();
	await expectDialogWithinViewport(page, page.getByRole("dialog", { name: "Add personal item" }));
});

test("keeps character details visible when personal inventory fails", async ({ page }) => {
	await page.route("**/api/characters/*/items**", async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Inventory load is temporarily unavailable." }),
			});
			return;
		}
		await route.continue();
	});
	await page.goto("/");
	await createCharacter(page, `A7 Inventory Failure ${Date.now()}`, "Fighter");
	await openInventoryTab(page);
	await expect(page.getByText("Personal inventory unavailable")).toBeVisible();
	await expect(page.getByTestId("treasury-total")).toBeVisible();
	await openSpellsAndAbilitiesTab(page);
	await expect(page.getByText(/10 \/ 10 HP/)).toBeVisible();
});

function requireCatalogueFixture() {
	if (!catalogueFixture) throw new Error("Catalogue fixture was not prepared before navigation.");
	return catalogueFixture;
}

async function createCharacter(page: Page, name: string, className: string) {
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill(name);
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: className }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function selectOption(page: Page, container: Locator, label: string, option: string) {
	await container.getByRole("combobox", { name: label }).click();
	await page.getByRole("option", { name: option, exact: true }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
	const viewportWidth = page.viewportSize()?.width ?? 0;
	const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
}

async function expectDialogWithinViewport(page: Page, dialog: Locator) {
	const box = await dialog.boundingBox();
	const viewport = page.viewportSize();
	expect(box).not.toBeNull();
	expect(viewport).not.toBeNull();
	if (!box || !viewport) return;
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.y).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
	expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
	await expectNoHorizontalOverflow(page);
}
