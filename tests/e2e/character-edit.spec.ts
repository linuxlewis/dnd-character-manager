import { expect, test } from "./fixtures.ts";

test.describe("Edit character", () => {
	test("modifies ability scores and changes persist after refresh", async ({
		page,
		createCharacter,
	}) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}/edit`);

		await expect(page.getByRole("heading", { name: "Edit Character" })).toBeVisible();

		// Verify form is pre-populated
		await expect(page.getByLabel("Name")).toHaveValue("Thorin Ironforge");
		await expect(page.getByLabel("Race")).toHaveValue("Dwarf");

		// Modify ability scores to unique values
		await page.getByLabel("Strength (STR)").fill("20");
		await page.getByLabel("Charisma (CHA)").fill("15");

		await page.getByRole("button", { name: "Save Changes" }).click();

		// Should navigate back to list
		await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();

		// Navigate to character sheet to verify changes
		await page.getByText("Thorin Ironforge").click();
		await page.getByRole("tab", { name: "Stats" }).click();
		await expect(page.getByLabel("STR ability score")).toContainText("20");
		await expect(page.getByLabel("CHA ability score")).toContainText("15");

		// Refresh and verify persistence
		await page.reload();
		await page.getByRole("tab", { name: "Stats" }).click();
		await expect(page.getByLabel("STR ability score")).toContainText("20");
		await expect(page.getByLabel("CHA ability score")).toContainText("15");
	});

	test("edit form loads existing character data", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			name: "Elara Moonwhisper",
			race: "Elf",
			class: "Wizard",
			level: 3,
		});
		await page.goto(`/character/${character.id}/edit`);

		await expect(page.getByLabel("Name")).toHaveValue("Elara Moonwhisper");
		await expect(page.getByLabel("Race")).toHaveValue("Elf");
		await expect(page.getByLabel("Class")).toHaveValue("Wizard");
		await expect(page.getByLabel("Level")).toHaveValue("3");
	});
});
