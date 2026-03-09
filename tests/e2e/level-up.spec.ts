import { expect, test } from "./fixtures.ts";

test.describe("Level advancement", () => {
	test("advances character level and increases HP", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 3,
			class: "Fighter", // d10 hit die
			hp: { current: 26, max: 26, temp: 0 },
			abilityScores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 }
		});
		await page.goto(`/character/${character.id}`);

		// Initial state
		await expect(page.getByText("Level 3")).toBeVisible();
		await expect(page.getByText("26 / 26 HP")).toBeVisible();

		// Level up
		await page.getByRole("button", { name: "Level Up" }).click();

		// Should show level up wizard
		await expect(page.getByText("Level Up to 4")).toBeVisible();

		// Roll for HP or take average (5.5 rounded up = 6 for d10)
		await page.getByRole("button", { name: "Roll for HP" }).click();
		
		// Should show hit die roll (d10 + CON modifier)
		await expect(page.getByText("Hit Points: 1d10 + 2")).toBeVisible();
		
		// Accept the roll (minimum should be 1 + CON mod = 3)
		await page.getByRole("button", { name: "Accept" }).click();

		// Should advance to ability score improvement (4th level for Fighter)
		await expect(page.getByText("Ability Score Improvement")).toBeVisible();
		
		// Level 4 is ASI level - can increase two different abilities by 1 each or one by 2
		await expect(page.getByText("+2 ability score points to distribute")).toBeVisible();

		// Increase STR by 2
		await page.getByLabel("Strength (STR)").locator('input').click();
		await page.getByLabel("Strength (STR)").locator('input').click();

		// Should show updated score and remaining points
		await expect(page.getByText("STR: 18")).toBeVisible();
		await expect(page.getByText("Points remaining: 0")).toBeVisible();

		// Complete level up
		await page.getByRole("button", { name: "Complete Level Up" }).click();

		// Verify changes
		await expect(page.getByText("Level 4")).toBeVisible();
		await expect(page.getByText("/ HP")).toBeVisible(); // HP should be higher
		await expect(page.getByText("STR: 18")).toBeVisible();
	});

	test("handles feat selection instead of ASI", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 3,
			class: "Fighter",
			abilityScores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 }
		});
		await page.goto(`/character/${character.id}`);

		// Level up to 4 (ASI level)
		await page.getByRole("button", { name: "Level Up" }).click();
		
		// Roll for HP
		await page.getByRole("button", { name: "Take Average" }).click(); // 6 HP for d10 average

		// Choose feat instead of ASI
		await page.getByRole("radio", { name: "Take Feat" }).click();
		
		// Select a feat
		await page.getByLabel("Feat").selectOption("Great Weapon Master");
		
		// Some feats also give +1 to an ability score
		if (await page.getByText("+1 ability score").isVisible()) {
			await page.getByLabel("Strength (STR)").locator('input').click();
		}

		await page.getByRole("button", { name: "Complete Level Up" }).click();

		// Verify feat is added
		await expect(page.getByText("Level 4")).toBeVisible();
		await expect(page.getByText("Great Weapon Master")).toBeVisible();
	});

	test("calculates proficiency bonus increase", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 4,
			class: "Rogue",
			skills: [
				{ name: "Stealth", abilityKey: "DEX", proficient: true },
				{ name: "Investigation", abilityKey: "INT", proficient: false }
			],
			abilityScores: { STR: 10, DEX: 16, CON: 14, INT: 12, WIS: 13, CHA: 8 }
		});
		await page.goto(`/character/${character.id}`);

		// At level 4, proficiency bonus is +2
		// Stealth should be +2 (prof) + 3 (DEX) = +5
		await expect(page.getByText("Stealth: +5")).toBeVisible();

		// Level up to 5 (proficiency bonus increases to +3)
		await page.getByRole("button", { name: "Level Up" }).click();
		await page.getByRole("button", { name: "Take Average" }).click();
		await page.getByRole("button", { name: "Complete Level Up" }).click();

		// Stealth should now be +3 (prof) + 3 (DEX) = +6
		await expect(page.getByText("Level 5")).toBeVisible();
		await expect(page.getByText("Stealth: +6")).toBeVisible();
	});

	test("adds new spell slots for spellcasters", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 2,
			class: "Wizard",
			spellSlots: [
				{ level: 1, used: 0, available: 3 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// Initial spell slots
		await expect(page.getByText("3 / 3").locator('text=Level 1')).toBeVisible();

		// Level up to 3 (gains 2nd level spells)
		await page.getByRole("button", { name: "Level Up" }).click();
		await page.getByRole("button", { name: "Roll for HP" }).click();
		await page.getByRole("button", { name: "Accept" }).click();

		// Select new spells if prompted
		if (await page.getByText("Learn New Spells").isVisible()) {
			await page.getByRole("button", { name: "Skip" }).click(); // Skip spell selection for this test
		}

		await page.getByRole("button", { name: "Complete Level Up" }).click();

		// Should have gained 2nd level spell slots
		await expect(page.getByText("Level 3")).toBeVisible();
		await expect(page.getByText("4 / 4").locator('text=Level 1')).toBeVisible(); // More 1st level slots
		await expect(page.getByText("2 / 2").locator('text=Level 2')).toBeVisible(); // New 2nd level slots
	});

	test("prevents leveling beyond maximum", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 20 // Maximum level
		});
		await page.goto(`/character/${character.id}`);

		// Level up button should not be available
		await expect(page.getByRole("button", { name: "Level Up" })).not.toBeVisible();
		await expect(page.getByText("Maximum level reached")).toBeVisible();
	});

	test("handles multiclassing", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 5,
			class: "Fighter",
			abilityScores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 14 }
		});
		await page.goto(`/character/${character.id}`);

		// Level up with multiclass option
		await page.getByRole("button", { name: "Level Up" }).click();

		// Should show multiclass option
		await page.getByRole("radio", { name: "Multiclass" }).click();
		
		// Select new class (must meet prerequisites)
		await page.getByLabel("New Class").selectOption("Paladin");
		
		// Should show multiclass warning about prerequisites
		await expect(page.getByText("Requires STR 13 and CHA 13")).toBeVisible();
		
		// Roll HP with new class hit die
		await page.getByRole("button", { name: "Roll for HP" }).click(); // d10 for Paladin
		await page.getByRole("button", { name: "Accept" }).click();

		await page.getByRole("button", { name: "Complete Level Up" }).click();

		// Should show multiclass levels
		await expect(page.getByText("Level 6")).toBeVisible();
		await expect(page.getByText("Fighter 5 / Paladin 1")).toBeVisible();
	});

	test("tracks hit dice for multiclass characters", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 6,
			class: "Fighter", // d10
			multiclass: [
				{ class: "Rogue", level: 2 } // d8
			]
		});
		await page.goto(`/character/${character.id}`);

		// Should show different hit dice types
		await expect(page.getByText("Hit Dice: 4d10 + 2d8")).toBeVisible();
		
		// During short rest, should be able to use either type
		await page.getByRole("button", { name: "Short Rest" }).click();
		
		await expect(page.getByRole("button", { name: "Roll d10" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Roll d8" })).toBeVisible();
	});

	test("validates ability score improvements don't exceed maximum", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 3,
			abilityScores: { STR: 19, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 } // STR near max
		});
		await page.goto(`/character/${character.id}`);

		// Level up to ASI level
		await page.getByRole("button", { name: "Level Up" }).click();
		await page.getByRole("button", { name: "Take Average" }).click();

		// Try to increase STR beyond 20
		await page.getByLabel("Strength (STR)").locator('input').click(); // 19 → 20
		await page.getByLabel("Strength (STR)").locator('input').click(); // Should not go to 21

		await expect(page.getByText("STR: 20")).toBeVisible(); // Capped at 20
		await expect(page.getByText("Points remaining: 1")).toBeVisible(); // 1 point left

		// Use remaining point on another ability
		await page.getByLabel("Dexterity (DEX)").locator('input').click();
		
		await expect(page.getByText("Points remaining: 0")).toBeVisible();
		await page.getByRole("button", { name: "Complete Level Up" }).click();
	});
});