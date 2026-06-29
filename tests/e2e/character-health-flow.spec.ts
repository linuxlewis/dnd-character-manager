import { expect, test } from "@playwright/test";

test("creates a character and tracks health changes on detail", async ({ page }) => {
	await page.goto("/");

	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Mira");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Fighter" }).click();
	await page.getByLabel("Level").fill("3");
	await page.getByRole("button", { name: "Create character" }).click();

	await expect(page.getByRole("heading", { name: "Mira" })).toBeVisible();
	await expect(page.getByText("10 / 10 HP (Temp HP 0)")).toBeVisible();
	await expect(page.getByText("HP +5, Temp HP +5")).toBeHidden();

	await page.getByRole("button", { name: "Edit" }).click();
	await page.getByLabel("Temp HP").fill("5");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("15 / 15 HP (Temp HP +5)")).toBeVisible();

	await page.getByRole("button", { name: /History/ }).click();
	await expect(page.getByText("HP +5, Temp HP +5")).toBeVisible();

	await page.getByRole("button", { name: "Heal" }).click();
	await expect(page.getByLabel("Amount")).toBeFocused();
	await page.getByRole("button", { name: "Cancel" }).click();

	await page.getByRole("button", { name: "Damage" }).click();
	await expect(page.getByLabel("Amount")).toBeFocused();
	await page.getByLabel("Amount").fill("4");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("11 / 15 HP (Temp HP +5)")).toBeVisible();
	await expect(page.getByText("HP -4")).toBeVisible();

	await page.getByRole("button", { name: "Edit" }).click();
	await page.getByLabel("Max HP").fill("20");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("21 / 25 HP (Temp HP +5)")).toBeVisible();
	await expect(page.getByText("HP +10, Max HP +10")).toBeVisible();

	await page.reload();
	await page.getByText("Back to characters").click();
	await page.getByRole("link", { name: "Mira" }).click();
	await expect(page.getByText("21 / 25 HP (Temp HP +5)")).toBeVisible();
	await expect(page.getByText("HP +10, Max HP +10")).toBeHidden();
	await page.getByRole("button", { name: /History/ }).click();
	await expect(page.getByText("HP +10, Max HP +10")).toBeVisible();
});
