import { expect, test } from "./fixtures.ts";

test.describe("Character sheet view", () => {
	test("displays all character sections", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		// Header info
		await expect(page.getByRole("heading", { name: "Thorin Ironforge" })).toBeVisible();
		await expect(page.getByText("Dwarf Fighter")).toBeVisible();
		await expect(page.getByText("Level 5")).toBeVisible();

		// Ability scores section
		await expect(page.getByText("Ability Scores")).toBeVisible();
		const abilitySection = page.locator("section").filter({ has: page.getByText("Ability Scores") });
		for (const stat of ["STR", "DEX", "CON", "INT", "WIS", "CHA"]) {
			await expect(abilitySection.getByText(stat, { exact: true })).toBeVisible();
		}

		// HP section
		await expect(page.getByText("Hit Points")).toBeVisible();
		await expect(page.getByRole("progressbar", { name: "10 of 10 hit points" })).toBeVisible();

		// Skills section
		await expect(page.getByText("Skills")).toBeVisible();
		await expect(page.getByText("Athletics")).toBeVisible();
		await expect(page.getByText("Perception")).toBeVisible();

		// Notes section
		await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();

		// Action buttons
		await expect(page.getByRole("button", { name: "Damage" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Heal" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Delete Character" })).toBeVisible();
	});

	test("navigating from list to sheet and back", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto("/");

		await page.getByText("Thorin Ironforge").click();
		await expect(page.getByRole("heading", { name: "Thorin Ironforge" })).toBeVisible();

		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();
	});

	test("displays ability score modifiers correctly", async ({ page, createCharacter }) => {
		// STR 16 => +3, DEX 12 => +1, CON 14 => +2, INT 10 => +0, WIS 13 => +1, CHA 8 => -1
		await createCharacter();
		await page.goto("/");
		await page.getByText("Thorin Ironforge").click();

		// Check modifiers within the ability scores section specifically
		const abilitySection = page.locator("section").filter({ has: page.getByText("Ability Scores") });
		await expect(abilitySection.getByText("+3", { exact: true })).toBeVisible(); // STR mod
		await expect(abilitySection.getByText("-1", { exact: true })).toBeVisible(); // CHA mod
	});
});
