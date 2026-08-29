import { expect, type Page, test } from "@playwright/test";

test("completes the M1 personal treasury journey", async ({ page }) => {
	await page.goto("/");

	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Treasury One");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Fighter" }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Treasury One" })).toBeVisible();

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
	await expect(spendDialog).toBeVisible();
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
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Treasury Two");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard" }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Treasury Two" })).toBeVisible();
	await expectBalances(page, { pp: "0", gp: "0", sp: "0", cp: "0", total: "0.00 GP" });
});

async function expectBalances(
	page: Page,
	balances: { pp: string; gp: string; sp: string; cp: string; total: string },
) {
	const actual = await readBalances(page);
	expect(actual).toEqual(balances);
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
