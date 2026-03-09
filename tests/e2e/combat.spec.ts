import { expect, test } from "./fixtures.ts";

test.describe("Combat mechanics", () => {
	test("makes attack rolls with modifiers", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			abilityScores: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 13, CHA: 8 },
			level: 3 // +2 proficiency bonus
		});
		await page.goto(`/character/${character.id}`);

		// Make a melee attack (STR-based)
		await page.getByRole("button", { name: "Attack" }).click();
		await page.getByLabel("Weapon").selectOption("Longsword");
		await page.getByLabel("Target AC").fill("15");
		await page.getByRole("button", { name: "Roll Attack" }).click();

		// Should show attack roll with proper modifiers (+3 STR + 2 proficiency = +5)
		await expect(page.getByText("Attack Roll: d20 + 5")).toBeVisible();
		
		// Result should be calculated
		await expect(page.getByText("Total: ")).toBeVisible();
		await expect(page.getByText("Hit!")).toBeVisible().or(page.getByText("Miss!"));

		// If hit, should allow damage roll
		if (await page.getByText("Hit!").isVisible()) {
			await page.getByRole("button", { name: "Roll Damage" }).click();
			await expect(page.getByText("Damage: 1d8 + 3")).toBeVisible(); // d8 + STR mod
		}
	});

	test("applies damage to character", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			hp: { current: 25, max: 30, temp: 5 }
		});
		await page.goto(`/character/${character.id}`);

		// Initial HP
		await expect(page.getByText("25 / 30 HP + 5 temp")).toBeVisible();

		// Take damage
		await page.getByRole("button", { name: "Take Damage" }).click();
		await page.getByLabel("Damage Amount").fill("8");
		await page.getByLabel("Damage Type").selectOption("slashing");
		await page.getByRole("button", { name: "Apply Damage" }).click();

		// Temp HP should absorb first (3 damage to temp, 5 to current)
		await expect(page.getByText("20 / 30 HP")).toBeVisible();

		// Take more damage
		await page.getByRole("button", { name: "Take Damage" }).click();
		await page.getByLabel("Damage Amount").fill("15");
		await page.getByRole("button", { name: "Apply Damage" }).click();

		await expect(page.getByText("5 / 30 HP")).toBeVisible();
	});

	test("tracks initiative order", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			name: "Test Fighter",
			abilityScores: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 13, CHA: 8 }
		});
		await page.goto(`/character/${character.id}`);

		// Start combat
		await page.getByRole("button", { name: "Start Combat" }).click();

		// Roll initiative
		await page.getByRole("button", { name: "Roll Initiative" }).click();
		
		// Should show initiative roll (d20 + DEX modifier = +2)
		await expect(page.getByText("Initiative: d20 + 2")).toBeVisible();
		
		// Add other combatants
		await page.getByRole("button", { name: "Add Combatant" }).click();
		await page.getByLabel("Name").fill("Goblin 1");
		await page.getByLabel("Initiative").fill("12");
		await page.getByRole("button", { name: "Add" }).click();

		await page.getByRole("button", { name: "Add Combatant" }).click();
		await page.getByLabel("Name").fill("Goblin 2");
		await page.getByLabel("Initiative").fill("8");
		await page.getByRole("button", { name: "Add" }).click();

		// Initiative order should be displayed
		await expect(page.getByText("Initiative Order")).toBeVisible();
		// Should be sorted by initiative (highest first)
	});

	test("manages combat rounds and turns", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			name: "Test Fighter"
		});
		await page.goto(`/character/${character.id}`);

		// Start combat and set up initiative
		await page.getByRole("button", { name: "Start Combat" }).click();
		await page.getByRole("button", { name: "Roll Initiative" }).click();
		
		// Add an enemy
		await page.getByRole("button", { name: "Add Combatant" }).click();
		await page.getByLabel("Name").fill("Orc");
		await page.getByLabel("Initiative").fill("10");
		await page.getByRole("button", { name: "Add" }).click();

		// Should show current turn
		await expect(page.getByText("Round 1")).toBeVisible();
		await expect(page.getByText("Current Turn:")).toBeVisible();

		// End turn
		await page.getByRole("button", { name: "End Turn" }).click();
		
		// Should advance to next combatant
		await expect(page.getByText("Current Turn:")).toBeVisible();

		// Complete round
		await page.getByRole("button", { name: "End Turn" }).click();
		await expect(page.getByText("Round 2")).toBeVisible();
	});

	test("applies critical hits", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			abilityScores: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 13, CHA: 8 }
		});
		await page.goto(`/character/${character.id}`);

		// Make attack roll
		await page.getByRole("button", { name: "Attack" }).click();
		await page.getByLabel("Weapon").selectOption("Greataxe");
		
		// Manually set as critical (or simulate rolling 20)
		await page.getByRole("checkbox", { name: "Critical Hit" }).check();
		await page.getByRole("button", { name: "Roll Damage" }).click();

		// Critical should double damage dice (2d12 instead of 1d12)
		await expect(page.getByText("Critical Hit!")).toBeVisible();
		await expect(page.getByText("Damage: 2d12 + 3")).toBeVisible();
	});

	test("handles advantage and disadvantage", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			abilityScores: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 13, CHA: 8 }
		});
		await page.goto(`/character/${character.id}`);

		// Attack with advantage
		await page.getByRole("button", { name: "Attack" }).click();
		await page.getByLabel("Advantage").check();
		await page.getByRole("button", { name: "Roll Attack" }).click();

		// Should roll 2d20 and take higher
		await expect(page.getByText("Advantage: ")).toBeVisible();
		await expect(page.getByText("Rolling 2d20, taking higher")).toBeVisible();

		// Clear and test disadvantage
		await page.getByRole("button", { name: "New Attack" }).click();
		await page.getByLabel("Disadvantage").check();
		await page.getByRole("button", { name: "Roll Attack" }).click();

		// Should roll 2d20 and take lower
		await expect(page.getByText("Disadvantage: ")).toBeVisible();
		await expect(page.getByText("Rolling 2d20, taking lower")).toBeVisible();
	});

	test("calculates armor class correctly", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			abilityScores: { STR: 14, DEX: 16, CON: 14, INT: 10, WIS: 13, CHA: 8 }
		});
		await page.goto(`/character/${character.id}`);

		// Base AC should be 10 + DEX mod = 13
		await expect(page.getByText("AC: 13")).toBeVisible();

		// Override AC (wearing armor)
		await page.getByRole("button", { name: "Set AC" }).click();
		await page.getByLabel("Armor Class").fill("18");
		await page.getByRole("button", { name: "Set" }).click();

		await expect(page.getByText("AC: 18")).toBeVisible();

		// Reset to calculated AC
		await page.getByRole("button", { name: "Reset AC" }).click();
		await expect(page.getByText("AC: 13")).toBeVisible();
	});

	test("tracks conditions affecting combat", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Apply blinded condition
		await page.getByRole("button", { name: "Add Condition" }).click();
		await page.getByRole("option", { name: "Blinded" }).click();

		// Make attack while blinded
		await page.getByRole("button", { name: "Attack" }).click();
		
		// Should automatically apply disadvantage
		await expect(page.getByText("Disadvantage (Blinded)")).toBeVisible();
		await expect(page.getByRole("checkbox", { name: "Disadvantage" })).toBeChecked();

		// Remove condition
		await page.getByText("Blinded").locator('..').getByRole("button", { name: "Remove" }).click();
		
		// Attack should no longer have automatic disadvantage
		await page.getByRole("button", { name: "New Attack" }).click();
		await expect(page.getByRole("checkbox", { name: "Disadvantage" })).not.toBeChecked();
	});
});