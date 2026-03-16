import { expect, test } from "./fixtures.ts";

test.describe("Character deletion", () => {
	test("deletes a character and it disappears from the list", async ({
		page,
		createCharacter,
	}) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		await page.getByRole("button", { name: "Delete Character" }).click();
		await page.getByRole("button", { name: "Delete" }).click();

		await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Thorin Ironforge" })).not.toBeVisible();
		await expect(page.getByText("No characters yet. Create your first adventurer!")).toBeVisible();
	});
});
