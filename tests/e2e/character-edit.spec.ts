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
		await page.getByLabel("STR", { exact: true }).fill("20");
		await page.getByLabel("CHA", { exact: true }).fill("15");

		await page.getByRole("button", { name: "Save Changes" }).click();

		// Should navigate back to list
		await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();

		// Navigate to character sheet to verify changes
		await page.getByText("Thorin Ironforge").click();
		await expect(page.getByText("20")).toBeVisible(); // New STR
		await expect(page.getByText("15")).toBeVisible(); // New CHA

		// Refresh and verify persistence
		await page.reload();
		await expect(page.getByText("20")).toBeVisible();
		await expect(page.getByText("15")).toBeVisible();
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
