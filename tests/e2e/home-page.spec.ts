import { expect, test } from "@playwright/test";

test("explains the product and opens the character manager", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Stay in the story. Your character is ready." }),
	).toBeVisible();
	await expect(page.getByRole("region", { name: "Example character workspace" })).toBeVisible();
	await expect(page.getByText("Free to begin. No account required.")).toBeVisible();

	await page.getByRole("link", { name: "Create your character" }).click();

	await expect(page).toHaveURL(/\/characters\/new$/);
	await expect(page.getByRole("heading", { exact: true, name: "Create character" })).toBeVisible();
});
