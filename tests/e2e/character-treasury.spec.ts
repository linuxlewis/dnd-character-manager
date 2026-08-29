import { expect, type Locator, type Page, test } from "@playwright/test";

test("completes the M1 personal treasury journey", async ({ page }) => {
	await page.goto("/");
	await createCharacter(page, "Treasury One", "Fighter");

	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });

	await page.getByRole("button", { name: "Add funds" }).click();
	const addDialog = page.getByRole("dialog", { name: "Add funds" });
	await expect(addDialog).toBeVisible();
	await addDialog.getByLabel("Platinum pieces (PP)").fill("1");
	await addDialog.getByLabel("Gold pieces (GP)").fill("3");
	await addDialog.getByLabel("Silver pieces (SP)").fill("4");
	await addDialog.getByLabel("Copper pieces (CP)").fill("5");
	await addDialog.getByRole("button", { name: "Preview add" }).click();
	await expect(addDialog.getByText("Server-backed result preview")).toBeVisible();
	const addNextBalances = addDialog.getByText("Next balances", { exact: true }).locator("..");
	await expectPreviewBalance(addNextBalances, "PP", "1");
	await expectPreviewBalance(addNextBalances, "GP", "3");
	await expectPreviewBalance(addNextBalances, "SP", "4");
	await expectPreviewBalance(addNextBalances, "CP", "5");
	await expect(addDialog.getByText("Next total GP value").locator("..")).toContainText("13.45 GP");
	await addDialog.getByRole("button", { name: "Confirm add funds" }).click();
	await expect(addDialog).toBeHidden();
	await expectBalances(page, { pp: "1", gp: "3", sp: "4", cp: "5", total: "13.45 GP" });

	await page.getByRole("button", { name: "Spend" }).click();
	const spendDialog = page.getByRole("dialog", { name: "Spend funds" });
	await expect(spendDialog).toBeVisible();
	await spendDialog.getByRole("combobox", { name: "Denomination" }).click();
	await page.getByRole("option", { name: "Silver pieces (SP)" }).click();
	await spendDialog.getByLabel("Amount").fill("5");
	await spendDialog.getByRole("button", { name: "Preview spend" }).click();
	await expect(spendDialog.getByText("Returned change")).toBeVisible();
	await expect(spendDialog.getByText("Returned change").locator("..")).toContainText("SP 5");
	await expect(spendDialog.getByText("Next total GP value").locator("..")).toContainText(
		"12.95 GP",
	);
	await spendDialog.getByRole("button", { name: "Confirm spend" }).click();
	await expect(spendDialog).toBeHidden();
	await expectBalances(page, { pp: "1", gp: "2", sp: "9", cp: "5", total: "12.95 GP" });

	const balancesBeforeOverspend = await readBalances(page);
	await page.getByRole("button", { name: "Spend" }).click();
	await spendDialog.getByLabel("Amount").fill("100");
	await spendDialog.getByRole("button", { name: "Preview spend" }).click();
	await expect(spendDialog.getByText("Insufficient funds")).toBeVisible();
	await expect(spendDialog.getByRole("button", { name: "Confirm spend" })).toBeDisabled();
	await expect(readBalances(page)).resolves.toEqual(balancesBeforeOverspend);
	await spendDialog.getByRole("button", { name: "Cancel" }).click();

	await page.reload();
	await expect(page.getByRole("heading", { name: "Treasury One" })).toBeVisible();
	await expectBalances(page, { pp: "1", gp: "2", sp: "9", cp: "5", total: "12.95 GP" });

	await page.getByText("Back to characters").click();
	await createCharacter(page, "Treasury Two", "Wizard");
	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });
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
	await expect(page.getByRole("heading", { name: "Load Recovery" })).toBeVisible();
	await expect(page.getByText("Personal Treasury unavailable")).toBeVisible();
	await expect(page.getByText("10 / 10 HP (Temp HP 0)")).toBeVisible();

	treasuryAvailable = true;
	await page.reload();
	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });
});

test("recovers from a failed treasury preview without exposing stale confirmation", async ({
	page,
}) => {
	let previewAttempts = 0;
	await page.route("**/api/characters/*/treasury/preview/add", async (route) => {
		previewAttempts += 1;
		if (previewAttempts === 1) {
			return route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Add preview is temporarily unavailable." }),
			});
		}
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Preview Recovery", "Fighter");
	await page.getByRole("button", { name: "Add funds" }).click();
	const addDialog = page.getByRole("dialog", { name: "Add funds" });
	await addDialog.getByLabel("Gold pieces (GP)").fill("1");
	await addDialog.getByRole("button", { name: "Preview add" }).click();
	await expect(addDialog.getByText("Add preview failed")).toBeVisible();
	await expect(addDialog.getByRole("button", { name: "Confirm add funds" })).toBeHidden();

	await addDialog.getByRole("button", { name: "Preview add" }).click();
	await expect(addDialog.getByRole("button", { name: "Confirm add funds" })).toBeVisible();
	await expect(previewAttempts).toBe(2);
	await addDialog.getByRole("button", { name: "Confirm add funds" }).click();
	await expectBalances(page, { pp: "0", gp: "1", sp: "0", cp: "0", total: "1.00 GP" });
});

test("reconciles failed treasury confirmation and requires a fresh preview for retry", async ({
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
				body: JSON.stringify({ error: "Add confirmation is temporarily unavailable." }),
			});
		}
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Mutation Recovery", "Fighter");
	await page.getByRole("button", { name: "Add funds" }).click();
	const addDialog = page.getByRole("dialog", { name: "Add funds" });
	await addDialog.getByLabel("Gold pieces (GP)").fill("1");
	await addDialog.getByRole("button", { name: "Preview add" }).click();
	await addDialog.getByRole("button", { name: "Confirm add funds" }).click();
	await expect(addDialog.getByText("Add funds failed")).toBeVisible();
	await expect(addDialog.getByRole("button", { name: "Confirm add funds" })).toBeHidden();
	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });

	await addDialog.getByRole("button", { name: "Preview add" }).click();
	await expect(addDialog.getByRole("button", { name: "Confirm add funds" })).toBeVisible();
	await addDialog.getByRole("button", { name: "Confirm add funds" }).click();
	await expect(addDialog).toBeHidden();
	await expectBalances(page, { pp: "0", gp: "1", sp: "0", cp: "0", total: "1.00 GP" });
	await expect(mutationAttempts).toBe(2);
});

test("keeps treasury controls within the mobile viewport", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await createCharacter(page, "Mobile Treasury", "Fighter");
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
	await expect(addDialog.getByRole("button", { name: "Preview add" })).toBeVisible();
	await addDialog.getByRole("button", { name: "Close add funds dialog" }).click();

	await page.getByRole("button", { name: "Spend" }).click();
	const spendDialog = page.getByRole("dialog", { name: "Spend funds" });
	await expectDialogWithinViewport(page, spendDialog);
	await expect(spendDialog.getByLabel("Amount")).toHaveCSS("font-size", "16px");
	await expect(spendDialog.getByRole("button", { name: "Preview spend" })).toBeVisible();
});

async function createCharacter(page: Page, name: string, className: string) {
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill(name);
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: className }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function expectPreviewBalance(container: Locator, abbreviation: string, amount: string) {
	await expect(container.getByText(abbreviation, { exact: true }).locator("..")).toContainText(
		amount,
	);
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
