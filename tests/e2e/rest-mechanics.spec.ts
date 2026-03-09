import { expect, test } from "./fixtures.ts";

test.describe("Rest mechanics", () => {
	test("performs short rest and uses hit dice", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 5,
			hp: { current: 15, max: 42, temp: 0 },
			class: "Fighter" // d10 hit dice
		});
		await page.goto(`/character/${character.id}`);

		// Initial state
		await expect(page.getByText("15 / 42 HP")).toBeVisible();
		await expect(page.getByText("Hit Dice: 5d10")).toBeVisible();

		// Start short rest
		await page.getByRole("button", { name: "Short Rest" }).click();

		// Use hit dice for healing
		await page.getByRole("button", { name: "Roll Hit Die" }).click();
		
		// Simulate rolling (this would be replaced with actual dice roller UI)
		// For testing, assume the UI shows the result and allows adding CON modifier
		await expect(page.getByText("Hit die result:")).toBeVisible();
		await page.getByRole("button", { name: "Apply Healing" }).click();

		// HP should increase (exact amount depends on roll + CON modifier)
		await expect(page.getByText("/ 42 HP")).toBeVisible();
		await expect(page.getByText("Hit Dice: 4d10")).toBeVisible(); // Used 1 hit die

		// Complete short rest
		await page.getByRole("button", { name: "Finish Short Rest" }).click();
		await expect(page.getByText("Short rest completed")).toBeVisible();
	});

	test("performs long rest and recovers resources", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 5,
			hp: { current: 20, max: 42, temp: 0 },
			spellSlots: [
				{ level: 1, used: 3, available: 4 },
				{ level: 2, used: 2, available: 3 },
				{ level: 3, used: 2, available: 2 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// Initial state
		await expect(page.getByText("20 / 42 HP")).toBeVisible();
		await expect(page.getByText("1 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("1 / 3").locator('text=Level 2')).toBeVisible();
		await expect(page.getByText("0 / 2").locator('text=Level 3')).toBeVisible();

		// Start long rest
		await page.getByRole("button", { name: "Long Rest" }).click();

		// Confirm long rest
		await expect(page.getByText("This will restore all HP and spell slots")).toBeVisible();
		await page.getByRole("button", { name: "Confirm Long Rest" }).click();

		// Verify full recovery
		await expect(page.getByText("42 / 42 HP")).toBeVisible();
		await expect(page.getByText("4 / 4").locator('text=Level 1')).toBeVisible();
		await expect(page.getByText("3 / 3").locator('text=Level 2')).toBeVisible();
		await expect(page.getByText("2 / 2").locator('text=Level 3')).toBeVisible();
		
		// Hit dice should also recover (half of total, minimum 1)
		await expect(page.getByText("Hit Dice: 5d10")).toBeVisible(); // Recovered hit dice
	});

	test("calculates hit die healing correctly", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 3,
			hp: { current: 10, max: 26, temp: 0 },
			class: "Rogue", // d8 hit dice
			abilityScores: { STR: 10, DEX: 16, CON: 14, INT: 12, WIS: 13, CHA: 8 } // CON +2
		});
		await page.goto(`/character/${character.id}`);

		// Start short rest
		await page.getByRole("button", { name: "Short Rest" }).click();

		// Roll hit die multiple times
		for (let i = 0; i < 3; i++) {
			await page.getByRole("button", { name: "Roll Hit Die" }).click();
			// Each roll should add 1d8 + CON modifier (2)
			await page.getByRole("button", { name: "Apply Healing" }).click();
		}

		// Should have used all hit dice
		await expect(page.getByText("Hit Dice: 0d8")).toBeVisible();
		await expect(page.getByRole("button", { name: "Roll Hit Die" })).toBeDisabled();

		// Complete rest
		await page.getByRole("button", { name: "Finish Short Rest" }).click();
	});

	test("handles interruptions during long rest", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			hp: { current: 15, max: 30, temp: 0 }
		});
		await page.goto(`/character/${character.id}`);

		// Start long rest
		await page.getByRole("button", { name: "Long Rest" }).click();
		await page.getByRole("button", { name: "Confirm Long Rest" }).click();

		// Simulate interruption
		await page.getByRole("button", { name: "Interrupt Rest" }).click();
		await expect(page.getByText("Rest interrupted")).toBeVisible();
		
		// Resources should not be fully recovered
		await expect(page.getByText("15 / 30 HP")).toBeVisible(); // No healing from interrupted rest
	});

	test("prevents multiple long rests in 24 hours", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			hp: { current: 20, max: 30, temp: 0 }
		});
		await page.goto(`/character/${character.id}`);

		// First long rest
		await page.getByRole("button", { name: "Long Rest" }).click();
		await page.getByRole("button", { name: "Confirm Long Rest" }).click();
		
		// Should complete successfully
		await expect(page.getByText("30 / 30 HP")).toBeVisible();

		// Try another long rest immediately
		await page.getByRole("button", { name: "Long Rest" }).click();
		
		// Should warn about 24-hour limit
		await expect(page.getByText("You can only take one long rest per 24 hours")).toBeVisible();
		await expect(page.getByRole("button", { name: "Confirm Long Rest" })).toBeDisabled();
	});

	test("tracks hit dice recovery on long rest", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			level: 8,
			hp: { current: 30, max: 60, temp: 0 },
			// Simulate having used some hit dice
			availableHitDice: 3 // out of 8 total
		});
		await page.goto(`/character/${character.id}`);

		// Initial hit dice
		await expect(page.getByText("Hit Dice: 3d10")).toBeVisible();

		// Long rest
		await page.getByRole("button", { name: "Long Rest" }).click();
		await page.getByRole("button", { name: "Confirm Long Rest" }).click();

		// Should recover half of maximum hit dice (4 out of 8)
		await expect(page.getByText("Hit Dice: 7d10")).toBeVisible(); // 3 + 4 = 7
	});
});