import { expect, test } from "./fixtures.ts";

test.describe("Equipment management", () => {
	test("adds and removes an equipment item", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		await page.getByLabel("Item name").fill("Longsword");
		await page.getByLabel("Quantity").fill("1");
		await page.getByLabel("Weight").fill("3");
		await page.getByRole("button", { name: "Add" }).click();

		await expect(page.getByText("Longsword", { exact: true }).first()).toBeVisible();
		await expect(page.getByText("3 lbs", { exact: true }).first()).toBeVisible();

		await page.getByRole("button", { name: "Remove Longsword" }).click();
		await expect(page.getByText("No equipment yet. Add items below.")).toBeVisible();
	});

	test("adds equipment with category and description", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		await page.getByLabel("Item name").fill("Chain Mail");
		await page.getByLabel("Category").selectOption("armor");
		await page.getByLabel("Quantity").fill("1");
		await page.getByLabel("Weight").fill("55");
		await page.getByLabel("Description").fill("AC 16, Stealth disadvantage");
		await page.getByRole("button", { name: "Add" }).click();

		await expect(page.getByText("Chain Mail").first()).toBeVisible();
		await expect(page.getByText("Armor").first()).toBeVisible();
		await expect(page.getByText("AC 16, Stealth disadvantage")).toBeVisible();
		await expect(page.getByText("55 lbs", { exact: true }).first()).toBeVisible();
	});

	test("equips and unequips an item", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		await page.getByLabel("Item name").fill("Longsword");
		await page.getByLabel("Category").selectOption("weapon");
		await page.getByLabel("Quantity").fill("1");
		await page.getByLabel("Weight").fill("3");
		await page.getByRole("button", { name: "Add" }).click();

		await expect(page.getByText("Longsword").first()).toBeVisible();

		await page.getByRole("button", { name: "Equip Longsword" }).click();
		await expect(page.getByRole("button", { name: "Unequip Longsword" })).toBeVisible();

		// Equipped items section should show the item
		await expect(page.getByText("Equipped").first()).toBeVisible();

		await page.getByRole("button", { name: "Unequip Longsword" }).click();
		await expect(page.getByRole("button", { name: "Equip Longsword" })).toBeVisible();
	});

	test("displays carrying capacity based on STR", async ({ page, createCharacter }) => {
		// STR 16 = 240 lbs capacity
		const character = await createCharacter({
			abilityScores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 },
		});
		await page.goto(`/character/${character.id}`);

		await expect(page.getByText("Weight: 0 / 240 lbs")).toBeVisible();

		// Add heavy item
		await page.getByLabel("Item name").fill("Heavy Plate");
		await page.getByLabel("Quantity").fill("1");
		await page.getByLabel("Weight").fill("65");
		await page.getByRole("button", { name: "Add" }).click();

		await expect(page.getByText("Weight: 65 / 240 lbs")).toBeVisible();
	});

	test("shows encumbered warning when over capacity", async ({ page, createCharacter }) => {
		// STR 8 = 120 lbs capacity
		const character = await createCharacter({
			abilityScores: { STR: 8, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 },
		});
		await page.goto(`/character/${character.id}`);

		// Add item heavier than capacity
		await page.getByLabel("Item name").fill("Giant Rock");
		await page.getByLabel("Quantity").fill("1");
		await page.getByLabel("Weight").fill("150");
		await page.getByRole("button", { name: "Add" }).click();

		await expect(page.getByText("Encumbered")).toBeVisible();
		await expect(page.getByText("Weight: 150 / 120 lbs")).toBeVisible();
	});

	test("manages multiple items with different categories", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Add weapon
		await page.getByLabel("Item name").fill("Longsword");
		await page.getByLabel("Category").selectOption("weapon");
		await page.getByLabel("Quantity").fill("1");
		await page.getByLabel("Weight").fill("3");
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Longsword").first()).toBeVisible();

		// Add armor
		await page.getByLabel("Item name").fill("Shield");
		await page.getByLabel("Category").selectOption("shield");
		await page.getByLabel("Quantity").fill("1");
		await page.getByLabel("Weight").fill("6");
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Shield").first()).toBeVisible();

		// Add potions
		await page.getByLabel("Item name").fill("Healing Potion");
		await page.getByLabel("Category").selectOption("potion");
		await page.getByLabel("Quantity").fill("3");
		await page.getByLabel("Weight").fill("0.5");
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Healing Potion").first()).toBeVisible();

		// Total weight: 3 + 6 + (0.5*3) = 10.5
		await expect(page.getByText("Weight: 10.5 / 240 lbs")).toBeVisible();
	});

	test("equipment hidden on read-only slug view", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/characters/${character.slug}`);

		// The add form should not be visible on read-only view
		await expect(page.getByLabel("Item name")).not.toBeVisible();
		await expect(page.getByRole("button", { name: "Add" })).not.toBeVisible();
	});
});
