import { expect, test } from "./fixtures.ts";

test.describe("Conditions and status effects", () => {
	test("applies and removes conditions", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Apply condition
		await page.getByRole("button", { name: "Add Condition" }).click();
		await page.getByRole("option", { name: "Poisoned" }).click();
		
		// Verify condition appears
		await expect(page.getByText("Poisoned")).toBeVisible();
		await expect(page.getByText("Disadvantage on attack rolls and ability checks")).toBeVisible();

		// Remove condition
		await page.getByText("Poisoned").locator('..').getByRole("button", { name: "Remove" }).click();
		await expect(page.getByText("Poisoned")).not.toBeVisible();
	});

	test("manages temporary hit points", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			hp: { current: 25, max: 30, temp: 0 }
		});
		await page.goto(`/character/${character.id}`);

		// Initial HP display
		await expect(page.getByText("25 / 30 HP")).toBeVisible();

		// Add temporary HP
		await page.getByRole("button", { name: "Add Temp HP" }).click();
		await page.getByLabel("Temporary HP").fill("8");
		await page.getByRole("button", { name: "Apply" }).click();

		// Verify temp HP display
		await expect(page.getByText("25 / 30 HP + 8 temp")).toBeVisible();

		// Take damage - should reduce temp HP first
		await page.getByRole("button", { name: "Take Damage" }).click();
		await page.getByLabel("Damage").fill("5");
		await page.getByRole("button", { name: "Apply" }).click();

		await expect(page.getByText("25 / 30 HP + 3 temp")).toBeVisible();

		// Take more damage - should remove remaining temp and reduce current
		await page.getByRole("button", { name: "Take Damage" }).click();
		await page.getByLabel("Damage").fill("8");
		await page.getByRole("button", { name: "Apply" }).click();

		await expect(page.getByText("20 / 30 HP")).toBeVisible();
	});

	test("tracks concentration", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			spellSlots: [
				{ level: 1, used: 0, available: 4 },
				{ level: 2, used: 0, available: 3 }
			]
		});
		await page.goto(`/character/${character.id}`);

		// Cast concentration spell
		await page.getByRole("button", { name: "Cast Spell" }).click();
		await page.getByLabel("Spell Name").fill("Hold Person");
		await page.getByLabel("Level").selectOption("2");
		await page.getByRole("checkbox", { name: "Requires Concentration" }).check();
		await page.getByRole("button", { name: "Cast" }).click();

		// Verify concentration indicator
		await expect(page.getByText("Concentrating on: Hold Person")).toBeVisible();
		await expect(page.getByText("1 / 3").locator('text=Level 2')).toBeVisible();

		// Try to cast another concentration spell - should warn about breaking concentration
		await page.getByRole("button", { name: "Cast Spell" }).click();
		await page.getByLabel("Spell Name").fill("Web");
		await page.getByLabel("Level").selectOption("2");
		await page.getByRole("checkbox", { name: "Requires Concentration" }).check();
		await page.getByRole("button", { name: "Cast" }).click();

		// Should show concentration warning
		await expect(page.getByText("This will break concentration on Hold Person")).toBeVisible();
		await page.getByRole("button", { name: "Cast Anyway" }).click();

		// Concentration should update
		await expect(page.getByText("Concentrating on: Web")).toBeVisible();
		await expect(page.getByText("Hold Person")).not.toBeVisible();
	});

	test("handles concentration saves", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Cast concentration spell first
		await page.getByRole("button", { name: "Cast Spell" }).click();
		await page.getByLabel("Spell Name").fill("Bless");
		await page.getByLabel("Level").selectOption("1");
		await page.getByRole("checkbox", { name: "Requires Concentration" }).check();
		await page.getByRole("button", { name: "Cast" }).click();

		// Take damage to trigger concentration save
		await page.getByRole("button", { name: "Take Damage" }).click();
		await page.getByLabel("Damage").fill("12");
		await page.getByRole("button", { name: "Apply" }).click();

		// Should prompt for concentration save (DC = 10 or half damage, whichever is higher = 10)
		await expect(page.getByText("Constitution saving throw required (DC 10)")).toBeVisible();
		
		// Fail the save
		await page.getByRole("button", { name: "Failed" }).click();
		await expect(page.getByText("Concentrating on: Bless")).not.toBeVisible();

		// Or succeed the save
		// await page.getByRole("button", { name: "Succeeded" }).click();
		// await expect(page.getByText("Concentrating on: Bless")).toBeVisible();
	});

	test("manages multiple conditions simultaneously", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Apply multiple conditions
		await page.getByRole("button", { name: "Add Condition" }).click();
		await page.getByRole("option", { name: "Blinded" }).click();

		await page.getByRole("button", { name: "Add Condition" }).click();
		await page.getByRole("option", { name: "Frightened" }).click();

		await page.getByRole("button", { name: "Add Condition" }).click();
		await page.getByRole("option", { name: "Prone" }).click();

		// Verify all conditions are displayed
		await expect(page.getByText("Blinded")).toBeVisible();
		await expect(page.getByText("Frightened")).toBeVisible();
		await expect(page.getByText("Prone")).toBeVisible();

		// Remove one condition
		await page.getByText("Frightened").locator('..').getByRole("button", { name: "Remove" }).click();
		await expect(page.getByText("Frightened")).not.toBeVisible();
		await expect(page.getByText("Blinded")).toBeVisible();
		await expect(page.getByText("Prone")).toBeVisible();
	});
});