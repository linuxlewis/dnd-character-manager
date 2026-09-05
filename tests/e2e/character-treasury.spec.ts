import { expect, type Page, test } from "@playwright/test";
import { openInventoryTab, openSpellsAndAbilitiesTab } from "./character-detail-helpers.js";

test("completes the M1 personal treasury journey with live client previews", async ({ page }) => {
	let previewAttempts = 0;
	await page.route("**/api/characters/*/treasury/preview/*", async (route) => {
		previewAttempts += 1;
		await route.fulfill({
			status: 500,
			contentType: "application/json",
			body: JSON.stringify({ error: "The browser should not call preview endpoints." }),
		});
	});

	await page.goto("/");
	await createCharacter(page, "Treasury One", "Fighter");
	await openInventoryTab(page);

	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });

	await page.getByRole("button", { name: "Add funds" }).click();
	const addDialog = page.getByRole("dialog", { name: "Add funds" });
	await expect(addDialog).toBeVisible();
	await expect(addDialog.getByText("Preview")).toBeVisible();
	await expect(addDialog.getByRole("button", { name: "Add funds", exact: true })).toBeDisabled();
	await addDialog.getByLabel("Platinum pieces (PP)").fill("1");
	await addDialog.getByLabel("Gold pieces (GP)").fill("3");
	await addDialog.getByLabel("Silver pieces (SP)").fill("4");
	await addDialog.getByLabel("Copper pieces (CP)").fill("5");
	await expect(addDialog.getByText("Preview")).toBeVisible();
	await expect(addDialog.getByText("After change")).toBeVisible();
	await expect(addDialog.getByText("13.45 GP")).toBeVisible();
	await expect(addDialog.getByRole("button", { name: "Add funds", exact: true })).toBeEnabled();
	await expect(addDialog.getByText("Server-backed result preview")).toBeHidden();
	await addDialog.getByRole("button", { name: "Add funds", exact: true }).click();
	await expect(addDialog).toBeHidden();
	await expectBalances(page, { pp: "1", gp: "3", sp: "4", cp: "5", total: "13.45 GP" });

	await page.getByRole("button", { name: "Spend" }).click();
	const spendDialog = page.getByRole("dialog", { name: "Spend funds" });
	await expect(spendDialog).toBeVisible();
	await expect(spendDialog.getByText("Preview")).toBeVisible();
	await expect(spendDialog.getByRole("button", { name: "Spend", exact: true })).toBeDisabled();
	await spendDialog.getByLabel("Silver pieces (SP)").fill("5");
	await expect(spendDialog.getByText("Available: 4")).toBeVisible();
	await expect(spendDialog.getByText("Returned change")).toBeHidden();
	await expect(spendDialog.getByText("12.95 GP")).toBeVisible();
	await expect(spendDialog.getByRole("button", { name: "Confirm spend" })).toBeHidden();
	await spendDialog.getByRole("button", { name: "Spend", exact: true }).click();
	await expect(spendDialog).toBeHidden();
	await expectBalances(page, { pp: "1", gp: "2", sp: "9", cp: "5", total: "12.95 GP" });

	const balancesBeforeOverspend = await readBalances(page);
	await page.getByRole("button", { name: "Spend" }).click();
	await page
		.getByRole("dialog", { name: "Spend funds" })
		.getByLabel("Gold pieces (GP)")
		.fill("100");
	const overspendDialog = page.getByRole("dialog", { name: "Spend funds" });
	await expect(overspendDialog.getByText("Insufficient funds")).toBeVisible();
	await expect(overspendDialog.getByRole("button", { name: "Spend", exact: true })).toBeDisabled();
	await expect(readBalances(page)).resolves.toEqual(balancesBeforeOverspend);
	await overspendDialog.getByRole("button", { name: "Cancel" }).click();

	await expect(previewAttempts).toBe(0);
	await page.reload();
	await openInventoryTab(page);
	await expect(page.getByRole("heading", { name: "Treasury One" })).toBeVisible();
	await expectBalances(page, { pp: "1", gp: "2", sp: "9", cp: "5", total: "12.95 GP" });

	await page.getByText("Back to characters").click();
	await createCharacter(page, "Treasury Two", "Wizard");
	await openInventoryTab(page);
	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });
});

test("normalizes the entire balance after spending when an exact coin is available", async ({
	page,
}) => {
	await page.goto("/");
	await createCharacter(page, "Legacy Currency", "Fighter");
	await openInventoryTab(page);

	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	const addDialog = page.getByRole("dialog", { name: "Add funds" });
	await addDialog.getByLabel("Copper pieces (CP)").fill("100");
	await addDialog.getByRole("button", { name: "Add funds", exact: true }).click();
	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "100", total: "1.00 GP" });

	await page.getByRole("button", { name: "Spend", exact: true }).click();
	const spendDialog = page.getByRole("dialog", { name: "Spend funds" });
	await spendDialog.getByLabel("Copper pieces (CP)").fill("1");
	await expect(spendDialog.getByText("Available: 100")).toBeVisible();
	await expect(spendDialog.getByText("0.99 GP")).toBeVisible();
	await expect(spendDialog.getByText("Returned change")).toBeHidden();
	await spendDialog.getByRole("button", { name: "Spend", exact: true }).click();

	await expectBalances(page, { pp: "0", gp: "0", sp: "9", cp: "9", total: "0.99 GP" });
});

test("isolates and recovers from treasury load failures", async ({ page }) => {
	let treasuryAvailable = false;
	await page.route("**/api/characters/*/treasury", async (route) => {
		if (route.request().method() !== "GET" || treasuryAvailable) return route.continue();
		await route.fulfill({
			status: 503,
			contentType: "application/json",
			body: JSON.stringify({ error: "Treasury load is temporarily unavailable." }),
		});
	});

	await page.goto("/");
	await createCharacter(page, "Load Recovery", "Fighter");
	await openInventoryTab(page);
	await expect(page.getByRole("heading", { name: "Load Recovery" })).toBeVisible();
	await expect(page.getByText("Personal Treasury unavailable")).toBeVisible();
	await expect(page.getByRole("button", { name: "Retry treasury" })).toBeVisible();
	treasuryAvailable = true;
	await page.getByRole("button", { name: "Retry treasury" }).click();
	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });
	await openSpellsAndAbilitiesTab(page);
	await expect(page.getByText("10 / 10 HP (Temp HP 0)")).toBeVisible();
});

test("uses a single mutation after a failed add response and keeps the recovery warning", async ({
	page,
}) => {
	let mutationAttempts = 0;
	await page.route("**/api/characters/*/treasury", async (route) => {
		if (route.request().method() !== "PUT") return route.continue();
		mutationAttempts += 1;
		if (mutationAttempts === 1) {
			return route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Add funds is temporarily unavailable." }),
			});
		}
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Mutation Recovery", "Fighter");
	await openInventoryTab(page);
	await page.getByRole("button", { name: "Add funds" }).click();
	const addDialog = page.getByRole("dialog", { name: "Add funds" });
	await addDialog.getByLabel("Gold pieces (GP)").fill("1");
	await addDialog.getByRole("button", { name: "Add funds", exact: true }).click();
	await expect(addDialog).toBeHidden();
	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });
	const warning = page.getByRole("alert").filter({
		hasText: "Treasury confirmation could not be verified",
	});
	await expect(warning).toBeVisible();
	await expect(page.getByRole("button", { name: "Add funds", exact: true })).toBeDisabled();
	await warning.getByRole("button", { name: "I reviewed the balance" }).click();

	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	await addDialog.getByLabel("Gold pieces (GP)").fill("1");
	await addDialog.getByRole("button", { name: "Add funds", exact: true }).click();
	await expect(addDialog).toBeHidden();
	await expectBalances(page, { pp: "0", gp: "1", sp: "0", cp: "0", total: "1.00 GP" });
	await expect(mutationAttempts).toBe(2);
});

test("keeps treasury controls within the mobile viewport", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await createCharacter(page, "Mobile Treasury", "Fighter");
	await openInventoryTab(page);
	await expectNoHorizontalOverflow(page);

	await page.getByRole("button", { name: "Add funds" }).click();
	const addDialog = page.getByRole("dialog", { name: "Add funds" });
	await expectDialogWithinViewport(page, addDialog);
	for (const label of [
		"Platinum pieces (PP)",
		"Gold pieces (GP)",
		"Silver pieces (SP)",
		"Copper pieces (CP)",
	]) {
		await expect(addDialog.getByLabel(label)).toHaveCSS("font-size", "16px");
	}
	await expect(addDialog.getByRole("button", { name: "Add funds", exact: true })).toBeVisible();
	await addDialog.getByRole("button", { name: "Close add funds dialog" }).click();

	await page.getByRole("button", { name: "Spend" }).click();
	const spendDialog = page.getByRole("dialog", { name: "Spend funds" });
	await expectDialogWithinViewport(page, spendDialog);
	for (const label of [
		"Platinum pieces (PP)",
		"Gold pieces (GP)",
		"Silver pieces (SP)",
		"Copper pieces (CP)",
	]) {
		await expect(spendDialog.getByLabel(label)).toHaveCSS("font-size", "16px");
		await expect(spendDialog.getByText(/Available:/).first()).toBeVisible();
	}
	await expect(spendDialog.getByRole("button", { name: "Spend", exact: true })).toBeVisible();
});

async function createCharacter(page: Page, name: string, className: string) {
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill(name);
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: className }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
	const viewportWidth = page.viewportSize()?.width ?? 0;
	const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
}

async function expectDialogWithinViewport(page: Page, dialog: import("@playwright/test").Locator) {
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

async function expectBalances(
	page: Page,
	balances: { pp: string; gp: string; sp: string; cp: string; total: string },
) {
	await expect.poll(() => readBalances(page)).toEqual(balances);
}

async function readBalances(page: Page) {
	return {
		pp: await page.getByTestId("treasury-pp-balance").getByText(/\d/).textContent(),
		gp: await page.getByTestId("treasury-gp-balance").getByText(/\d/).textContent(),
		sp: await page.getByTestId("treasury-sp-balance").getByText(/\d/).textContent(),
		cp: await page.getByTestId("treasury-cp-balance").getByText(/\d/).textContent(),
		total: await page
			.getByTestId("treasury-total")
			.getByText(/\d+\.\d{2} GP/)
			.textContent(),
	};
}
