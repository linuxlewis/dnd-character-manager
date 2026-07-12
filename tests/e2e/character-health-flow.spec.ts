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

	await page.getByRole("button", { exact: true, name: "Edit" }).click();
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

	await page.getByRole("button", { exact: true, name: "Edit" }).click();
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

test("configures spell slots and tracks spell usage on detail", async ({ page }) => {
	await page.goto("/");

	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Tamsin");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard" }).click();
	await page.getByLabel("Level").fill("7");
	await page.getByRole("button", { name: "Create character" }).click();

	await expect(page.getByRole("heading", { name: "Tamsin" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Spell slots" })).toBeVisible();
	await expect(page.getByText("0 / 0 remaining").first()).toBeHidden();
	await expect(page.getByLabel("1st-level slot total")).toBeHidden();

	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("No spell slot changes yet.")).toBeVisible();
	await page.getByRole("button", { name: /Spell history/ }).click();

	await page.getByRole("button", { name: "Edit spells" }).click();
	await page.getByLabel("1st-level slot total").fill("2");
	await page.getByRole("button", { name: "Apply changes" }).click();
	await expect(page.getByText("2 / 2 remaining")).toBeVisible();
	await expect(page.getByRole("button", { name: "Add spell to 3rd-level" })).toBeHidden();
	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("Configured 1st-level: 2 slots")).toBeVisible();
	const historyBox = await page.getByText("Configured 1st-level: 2 slots").boundingBox();
	const firstSlotBox = await page.getByText("2 / 2 remaining").boundingBox();
	expect(historyBox?.y ?? 0).toBeLessThan(firstSlotBox?.y ?? 0);
	await page.getByRole("button", { name: /Spell history/ }).click();

	await page.getByRole("button", { name: "Edit spells" }).click();
	await page.getByRole("button", { name: "Add spell to 3rd-level" }).click();
	await expect(page.getByRole("dialog", { name: "Add spell to 3rd-level" })).toBeVisible();
	await page.getByLabel("Search spells").fill("haste");
	await expect(page.getByRole("button", { name: /Haste/ })).toBeVisible();
	await page.getByLabel("Search spells").fill("divine smite");
	await page.getByRole("button", { name: /^Divine Smite\b/ }).click();
	await expect(page.getByRole("dialog", { name: "Add spell to 3rd-level" })).toBeHidden();
	await expect(page.getByRole("button", { name: "View Divine Smite details" })).toBeVisible();
	await expect(page.getByText("1st-level spell")).toBeVisible();
	await page.getByRole("button", { name: "View Divine Smite details" }).click();
	await expect(page.getByRole("dialog", { name: "Divine Smite" })).toBeVisible();
	await expect(page.getByText("Spell 1st-level")).toBeVisible();
	await expect(page.getByText(/radiant damage/i)).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Divine Smite" })).toBeHidden();

	await page.getByRole("button", { name: "Use 1st-level" }).click();
	await expect(page.getByText("1 / 2 remaining")).toBeVisible();

	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("Used 1st-level slot")).toBeVisible();

	await page.getByRole("button", { name: "Restore 1st-level" }).click();
	await expect(page.getByText("2 / 2 remaining")).toBeVisible();
	await expect(page.getByText("Restored 1st-level slot")).toBeVisible();

	await page.reload();
	await expect(page.getByText("2 / 2 remaining")).toBeVisible();
	await expect(page.getByText("Divine Smite")).toBeVisible();
	await expect(page.getByText("Restored 1st-level slot")).toBeHidden();
	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("Restored 1st-level slot")).toBeVisible();
});
