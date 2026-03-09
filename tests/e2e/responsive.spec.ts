import { expect, test } from "./fixtures.ts";

test.describe("Responsive layout", () => {
	test("character list renders at mobile breakpoint", async ({ page, createCharacter }) => {
		await createCharacter();
		await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
		await page.goto("/");

		await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();
		await expect(page.getByText("Thorin Ironforge")).toBeVisible();
		await expect(page.getByRole("button", { name: "+ New Character" })).toBeVisible();

		// Header should still be visible
		await expect(page.getByText("D&D Character Manager")).toBeVisible();
	});

	test("character form renders at mobile breakpoint", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/character/new");

		await expect(page.getByRole("heading", { name: "New Character" })).toBeVisible();
		await expect(page.getByLabel("Name")).toBeVisible();
		await expect(page.getByLabel("Race")).toBeVisible();
		await expect(page.getByLabel("Class")).toBeVisible();

		// Ability score fields should be visible
		await expect(page.getByLabel("STR", { exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Create Character" })).toBeVisible();
	});

	test("character sheet renders at mobile breakpoint", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto(`/character/${character.id}`);

		await expect(page.getByRole("heading", { name: "Thorin Ironforge" })).toBeVisible();
		await expect(page.getByText("Ability Scores")).toBeVisible();
		await expect(page.getByText("Hit Points")).toBeVisible();
		await expect(page.getByText("Skills")).toBeVisible();

		// All content should be within viewport width
		const mainWidth = await page.locator("main").evaluate((el) => el.scrollWidth);
		expect(mainWidth).toBeLessThanOrEqual(375);
	});

	test("character sheet renders at tablet breakpoint", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto(`/character/${character.id}`);

		await expect(page.getByRole("heading", { name: "Thorin Ironforge" })).toBeVisible();
		await expect(page.getByText("Ability Scores")).toBeVisible();
		await expect(page.getByText("Hit Points")).toBeVisible();
	});
});
