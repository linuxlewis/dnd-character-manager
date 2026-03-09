import { expect, test } from "./fixtures.ts";

test.describe("Spell slot management", () => {
	test("uses and tracks spell slots", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 5,
			class: "Wizard",
			spellSlots: [
				{ level: 1, used: 0, available: 4 },
				{ level: 2, used: 0, available: 3 },
				{ level: 3, used: 0, available: 2 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// Initial spell slot display
		await expect(page.getByText("4 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("3 / 3").locator('text=Level 2')).toBeVisible();
		await expect(page.getByText("2 / 2").locator('text=Level 3')).toBeVisible();

		// Use a 1st level spell slot
		await page.getByText("Level 1").locator('..').getByRole("button", { name: "Use" }).click();
		await expect(page.getByText("3 / 4").locator('text=Level 1')).toBeVisible();

		// Use a 2nd level spell slot
		await page.getByText("Level 2").locator('..').getByRole("button", { name: "Use" }).click();
		await expect(page.getByText("2 / 3").locator('text=Level 2')).toBeVisible();

		// Use all 3rd level slots
		await page.getByText("Level 3").locator('..').getByRole("button", { name: "Use" }).click();
		await page.getByText("Level 3").locator('..').getByRole("button", { name: "Use" }).click();
		await expect(page.getByText("0 / 2").locator('text=Level 3')).toBeVisible();

		// Try to use another 3rd level slot when none available
		await expect(page.getByText("Level 3").locator('..').getByRole("button", { name: "Use" })).toBeDisabled();
	});

	test("restores spell slots individually", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 3,
			class: "Cleric",
			spellSlots: [
				{ level: 1, used: 3, available: 4 },
				{ level: 2, used: 2, available: 2 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// Used slots
		await expect(page.getByText("1 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("0 / 2").locator('text=Level 2')).toBeVisible();

		// Restore a 1st level slot
		await page.getByText("Level 1").locator('..').getByRole("button", { name: "Restore" }).click();
		await expect(page.getByText("2 / 4").locator('text=Level 1')).toBeVisible();

		// Restore a 2nd level slot
		await page.getByText("Level 2").locator('..').getByRole("button", { name: "Restore" }).click();
		await expect(page.getByText("1 / 2").locator('text=Level 2')).toBeVisible();

		// Try to restore when already at maximum
		await page.getByText("Level 2").locator('..').getByRole("button", { name: "Restore" }).click();
		await expect(page.getByText("2 / 2").locator('text=Level 2')).toBeVisible();
		
		// Restore button should be disabled when full
		await expect(page.getByText("Level 2").locator('..').getByRole("button", { name: "Restore" })).toBeDisabled();
	});

	test("casts spells using higher level slots", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 5,
			class: "Sorcerer",
			spellSlots: [
				{ level: 1, used: 4, available: 4 }, // No 1st level slots available
				{ level: 2, used: 0, available: 3 },
				{ level: 3, used: 0, available: 2 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// No 1st level slots available
		await expect(page.getByText("0 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("3 / 3").locator('text=Level 2')).toBeVisible();

		// Try to cast a 1st level spell
		await page.getByRole("button", { name: "Cast Spell" }).click();
		await page.getByLabel("Spell Name").fill("Magic Missile");
		await page.getByLabel("Base Level").selectOption("1");

		// Should show option to upcast
		await expect(page.getByText("No 1st level slots available")).toBeVisible();
		await page.getByLabel("Cast at Level").selectOption("2");
		await page.getByRole("button", { name: "Cast" }).click();

		// Should use a 2nd level slot
		await expect(page.getByText("2 / 3").locator('text=Level 2')).toBeVisible();
		await expect(page.getByText("Spell cast at 2nd level")).toBeVisible();
	});

	test("handles warlock pact magic slots", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 5,
			class: "Warlock",
			spellSlots: [
				{ level: 3, used: 0, available: 2 } // Warlocks have higher level slots but fewer
			]
		});
		await page.goto(`/character/${character.id}`);

		// Warlock spell slots (all same level)
		await expect(page.getByText("2 / 2").locator('text=Pact Magic (3rd)')).toBeVisible();

		// Use both slots
		await page.getByText("Pact Magic").locator('..').getByRole("button", { name: "Use" }).click();
		await page.getByText("Pact Magic").locator('..').getByRole("button", { name: "Use" }).click();
		await expect(page.getByText("0 / 2").locator('text=Pact Magic (3rd)')).toBeVisible();

		// Short rest should restore warlock slots
		await page.getByRole("button", { name: "Short Rest" }).click();
		await page.getByRole("button", { name: "Finish Short Rest" }).click();

		await expect(page.getByText("2 / 2").locator('text=Pact Magic (3rd)')).toBeVisible();
	});

	test("long rest restores all spell slots", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 5,
			class: "Wizard",
			spellSlots: [
				{ level: 1, used: 4, available: 4 },
				{ level: 2, used: 3, available: 3 },
				{ level: 3, used: 2, available: 2 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// All slots used
		await expect(page.getByText("0 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("0 / 3").locator('text=Level 2')).toBeVisible();
		await expect(page.getByText("0 / 2").locator('text=Level 3')).toBeVisible();

		// Long rest
		await page.getByRole("button", { name: "Long Rest" }).click();
		await page.getByRole("button", { name: "Confirm Long Rest" }).click();

		// All slots restored
		await expect(page.getByText("4 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("3 / 3").locator('text=Level 2')).toBeVisible();
		await expect(page.getByText("2 / 2").locator('text=Level 3')).toBeVisible();
	});

	test("handles sorcery points conversion", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 3,
			class: "Sorcerer",
			spellSlots: [
				{ level: 1, used: 2, available: 4 },
				{ level: 2, used: 0, available: 2 }
			],
			sorceryPoints: { current: 3, maximum: 3 }
		});
		await page.goto(`/character/${character.id}`);

		// Initial state
		await expect(page.getByText("2 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("Sorcery Points: 3 / 3")).toBeVisible();

		// Convert sorcery points to spell slot
		await page.getByRole("button", { name: "Create Spell Slot" }).click();
		await page.getByLabel("Slot Level").selectOption("1"); // 1st level slot costs 2 sorcery points
		await page.getByRole("button", { name: "Create" }).click();

		await expect(page.getByText("3 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("Sorcery Points: 1 / 3")).toBeVisible();

		// Convert spell slot to sorcery points
		await page.getByRole("button", { name: "Convert to Sorcery Points" }).click();
		await page.getByText("Level 2").locator('..').getByRole("button", { name: "Convert" }).click();

		await expect(page.getByText("1 / 2").locator('text=Level 2')).toBeVisible();
		await expect(page.getByText("Sorcery Points: 3 / 3")).toBeVisible(); // +2 points for 2nd level slot
	});

	test("prevents spell slot operations when invalid", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 1,
			class: "Ranger", // Half-caster, no spells at level 1
			spellSlots: []
		});
		await page.goto(`/character/${character.id}`);

		// No spell slots should be shown
		await expect(page.getByText("No spell slots")).toBeVisible();
		await expect(page.getByRole("button", { name: "Use" })).not.toBeVisible();
		await expect(page.getByRole("button", { name: "Cast Spell" })).not.toBeVisible();
	});

	test("tracks ritual spells separately", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 3,
			class: "Wizard",
			spellSlots: [
				{ level: 1, used: 0, available: 4 },
				{ level: 2, used: 0, available: 2 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// Cast a ritual spell
		await page.getByRole("button", { name: "Cast Spell" }).click();
		await page.getByLabel("Spell Name").fill("Detect Magic");
		await page.getByLabel("Base Level").selectOption("1");
		await page.getByRole("checkbox", { name: "Cast as Ritual" }).check();
		await page.getByRole("button", { name: "Cast" }).click();

		// Should not use a spell slot
		await expect(page.getByText("4 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("Ritual cast: Detect Magic (takes 10 minutes)")).toBeVisible();
	});

	test("handles spell slot recovery features", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 2,
			class: "Wizard",
			spellSlots: [
				{ level: 1, used: 3, available: 3 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// All 1st level slots used
		await expect(page.getByText("0 / 3").locator('text=Level 1')).toBeVisible();

		// Use Arcane Recovery (once per long rest)
		await page.getByRole("button", { name: "Arcane Recovery" }).click();
		
		// Can recover slots equal to half wizard level (rounded up)
		await expect(page.getByText("Recover up to 1 level of spell slots")).toBeVisible();
		await page.getByRole("checkbox", { name: "1st level slot" }).check();
		await page.getByRole("button", { name: "Recover" }).click();

		await expect(page.getByText("1 / 3").locator('text=Level 1')).toBeVisible();
		
		// Feature should be used
		await expect(page.getByRole("button", { name: "Arcane Recovery" })).toBeDisabled();
		await expect(page.getByText("Arcane Recovery used (recharges on long rest)")).toBeVisible();
	});

	test("shows spell preparation for prepared casters", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 3,
			class: "Cleric",
			abilityScores: { STR: 10, DEX: 12, CON: 14, INT: 10, WIS: 16, CHA: 8 }, // WIS modifier +3
			spellSlots: [
				{ level: 1, used: 0, available: 4 },
				{ level: 2, used: 0, available: 2 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// Should show prepared spells section
		await expect(page.getByText("Prepared Spells")).toBeVisible();
		await expect(page.getByText("Can prepare 6 spells")).toBeVisible(); // 3 level + 3 WIS mod

		// Prepare spells
		await page.getByRole("button", { name: "Prepare Spells" }).click();
		
		// Select spells to prepare
		await page.getByRole("checkbox", { name: "Cure Wounds (1st)" }).check();
		await page.getByRole("checkbox", { name: "Healing Word (1st)" }).check();
		await page.getByRole("checkbox", { name: "Hold Person (2nd)" }).check();
		
		await page.getByRole("button", { name: "Confirm Preparation" }).click();

		// Should show prepared spells
		await expect(page.getByText("Prepared: 3 / 6")).toBeVisible();
		await expect(page.getByText("Cure Wounds")).toBeVisible();
		await expect(page.getByText("Healing Word")).toBeVisible();
		await expect(page.getByText("Hold Person")).toBeVisible();
	});
});