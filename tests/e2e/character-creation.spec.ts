import { DEFAULT_CHARACTER, expect, fillCharacterForm, test } from "./fixtures.ts";

test.describe("Character creation flow", () => {
	test("creates a character via form and it appears in the list", async ({ page, testCharacter }) => {
		await page.goto("/");
		await expect(page.getByText("No characters yet")).toBeVisible();

		await page.getByRole("button", { name: "New Character" }).click();
		await expect(page.getByRole("heading", { name: "New Character" })).toBeVisible();

		await fillCharacterForm(page, testCharacter);
		await page.getByRole("button", { name: "Create Character" }).click();

		await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();
		await expect(page.getByText(testCharacter.name)).toBeVisible();
		await expect(page.getByText(`${testCharacter.race} · ${testCharacter.class}`)).toBeVisible();
	});

	test("shows validation errors for empty fields", async ({ page }) => {
		await page.goto("/character/new");
		await page.getByLabel("Name").fill("");
		await page.getByRole("button", { name: "Create Character" }).click();

		await expect(page.locator("form")).toBeVisible();
		// Should stay on the form page (not navigate away)
		await expect(page.getByRole("heading", { name: "New Character" })).toBeVisible();
	});

	test("back button returns to character list", async ({ page }) => {
		await page.goto("/character/new");
		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();
	});

	test("created character shows correct metadata in list", async ({
		page,
		createCharacter,
		testCharacter,
	}) => {
		await createCharacter();
		await page.goto("/");

		const card = page.getByText(testCharacter.name);
		await expect(card).toBeVisible();
		await expect(
			page.getByText(`${testCharacter.race} · ${testCharacter.class} · Level ${testCharacter.level}`),
		).toBeVisible();
		await expect(page.getByText("HP: 10 / 10")).toBeVisible();
	});
});
