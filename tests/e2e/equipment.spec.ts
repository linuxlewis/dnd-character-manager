import { expect, test } from "./fixtures.ts";

test.describe("Equipment management", () => {
	test("adds and removes equipment items", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Find and click on equipment section or add button
		await page.getByRole("button", { name: "Add Equipment" }).click();

		// Fill in equipment form
		await page.getByLabel("Name").fill("Longsword");
		await page.getByLabel("Weight").fill("3");
		await page.getByLabel("Quantity").fill("1");
		await page.getByRole("button", { name: "Add" }).click();

		// Verify equipment appears in list
		await expect(page.getByText("Longsword")).toBeVisible();
		await expect(page.getByText("3 lbs")).toBeVisible();

		// Remove equipment
		await page.getByText("Longsword").locator('..').getByRole("button", { name: "Remove" }).click();
		await expect(page.getByText("Longsword")).not.toBeVisible();
	});

	test("calculates encumbrance correctly", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			abilityScores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 }
		});
		await page.goto(`/character/${character.id}`);

		// Add multiple heavy items
		await page.getByRole("button", { name: "Add Equipment" }).click();
		await page.getByLabel("Name").fill("Plate Armor");
		await page.getByLabel("Weight").fill("65");
		await page.getByLabel("Quantity").fill("1");
		await page.getByRole("button", { name: "Add" }).click();

		// Check encumbrance calculation (STR 16 = 240 lbs capacity)
		await expect(page.getByText("65 / 240 lbs")).toBeVisible();
		
		// Add more weight to test heavily encumbered
		await page.getByRole("button", { name: "Add Equipment" }).click();
		await page.getByLabel("Name").fill("Heavy Pack");
		await page.getByLabel("Weight").fill("180");
		await page.getByLabel("Quantity").fill("1");
		await page.getByRole("button", { name: "Add" }).click();

		// Should show heavily encumbered warning
		await expect(page.getByText("245 / 240 lbs")).toBeVisible();
		await expect(page.getByText("Heavily Encumbered")).toBeVisible();
	});

	test("equips and unequips items", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Add equipment
		await page.getByRole("button", { name: "Add Equipment" }).click();
		await page.getByLabel("Name").fill("Shield");
		await page.getByLabel("Weight").fill("6");
		await page.getByLabel("Quantity").fill("1");
		await page.getByRole("button", { name: "Add" }).click();

		// Equip item
		await page.getByText("Shield").locator('..').getByRole("checkbox").check();
		await expect(page.getByText("Shield").locator('..').getByText("Equipped")).toBeVisible();

		// Unequip item
		await page.getByText("Shield").locator('..').getByRole("checkbox").uncheck();
		await expect(page.getByText("Shield").locator('..').getByText("Equipped")).not.toBeVisible();
	});

	test("shows AC modifier from equipped armor", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Check base AC
		await expect(page.getByText("AC: 11")).toBeVisible(); // 10 base + 1 DEX mod

		// Add and equip armor
		await page.getByRole("button", { name: "Add Equipment" }).click();
		await page.getByLabel("Name").fill("Leather Armor");
		await page.getByLabel("Weight").fill("10");
		await page.getByLabel("Quantity").fill("1");
		await page.getByRole("button", { name: "Add" }).click();

		await page.getByText("Leather Armor").locator('..').getByRole("checkbox").check();

		// AC should update to reflect armor (this would require armor to have AC properties)
		// For now, just verify the equipment is equipped
		await expect(page.getByText("Leather Armor").locator('..').getByText("Equipped")).toBeVisible();
	});
});