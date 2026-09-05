import { expect, test } from "@playwright/test";

test("creates a character, lists it, opens detail, and persists across reloads", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { exact: true, name: "Characters" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "No characters yet" })).toBeVisible();

	await page.getByText("Create character").first().click();
	await expect(page).toHaveURL(/\/characters\/new$/);
	await expect(page.getByLabel("Name")).toHaveCSS("font-size", "16px");
	await expect(page.getByRole("combobox", { name: "Class" })).toHaveCSS("font-size", "16px");
	await expect(page.getByLabel("Level")).toHaveCSS("font-size", "16px");

	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByText("Name is required")).toBeVisible();
	await expect(page.getByText("Class is required")).toBeVisible();

	await page.getByText("Back to characters").click();
	await expect(page.getByRole("heading", { name: "No characters yet" })).toBeVisible();

	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Lyria Dawn");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard" }).click();
	await page.getByLabel("Level").fill("7");
	await page.getByRole("button", { name: "Create character" }).click();

	await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
	await expect(page.getByRole("heading", { name: "Lyria Dawn" })).toBeVisible();
	await expect(page.getByText("Wizard")).toBeVisible();
	await expect(page.getByText("Level 7", { exact: true })).toBeVisible();
	await expect(page.getByText("0 XP", { exact: true })).toBeVisible();
	await expect(page.getByText("34,000 XP to level 8")).toBeVisible();
	await expect(page.getByText("10 / 10 HP (Temp HP 0)")).toBeVisible();

	await page.getByRole("button", { name: "Edit character" }).click();
	await page.getByLabel("Character name").fill("Lyria Starfall");
	await page.getByLabel("Character level").fill("8");
	await page.getByLabel("Experience points").fill("27000");
	await page.getByRole("button", { name: "Save character" }).click();
	await expect(page.getByRole("heading", { name: "Lyria Starfall" })).toBeVisible();
	await expect(page.getByText("Level 8", { exact: true })).toBeVisible();
	await expect(page.getByText("27,000 XP")).toBeVisible();
	await expect(page.getByText("21,000 XP to level 9")).toBeVisible();

	await page.getByText("Back to characters").click();
	await expect(page).toHaveURL(/\/characters$/);
	await expect(page.getByRole("link", { name: "Lyria Starfall" })).toBeVisible();
	await expect(page.getByText("Level 8", { exact: true })).toBeVisible();

	await page.reload();
	await expect(page.getByRole("link", { name: "Lyria Starfall" })).toBeVisible();
	await expect(page.getByText("Level 8", { exact: true })).toBeVisible();

	await page.getByRole("link", { name: "Lyria Starfall" }).click();
	await expect(page.getByRole("heading", { name: "Lyria Starfall" })).toBeVisible();
	await expect(page.getByText("Wizard")).toBeVisible();
	await expect(page.getByText("Level 8", { exact: true })).toBeVisible();
	await expect(page.getByText("27,000 XP")).toBeVisible();

	await page.goBack();
	await expect(page).toHaveURL(/\/characters$/);
	await expect(page.getByRole("link", { name: "Lyria Starfall" })).toBeVisible();

	await page.goForward();
	await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
	await expect(page.getByRole("heading", { name: "Lyria Starfall" })).toBeVisible();
	await expect(page.getByText("Level 8", { exact: true })).toBeVisible();
	await expect(page.getByText("21,000 XP to level 9")).toBeVisible();
});

test("shows a not-found state for a missing character id", async ({ page }) => {
	await page.goto("/characters/00000000-0000-4000-8000-000000000000");

	await expect(page.getByText("Character not found")).toBeVisible();
	await page.getByText("Back to characters").click();
	await expect(page.getByRole("heading", { exact: true, name: "Characters" })).toBeVisible();
});
