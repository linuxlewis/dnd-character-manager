import { expect, test } from "./fixtures.ts";

test.describe("Equipment management", () => {
	test("adds and removes an equipment item", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		await page.getByLabel("Item name").fill("Longsword");
		await page.getByLabel("Quantity").fill("1");
		await page.getByLabel("Weight").fill("3");
		await page.getByRole("button", { name: "Add" }).click();

		await expect(page.getByText("Longsword", { exact: true })).toBeVisible();
		await expect(page.getByText("3 lbs", { exact: true })).toBeVisible();
		await expect(page.getByText("Total Weight: 3 lbs")).toBeVisible();

		await page.getByRole("button", { name: "Remove Longsword" }).click();
		await expect(page.getByText("Longsword", { exact: true })).not.toBeVisible();
		await expect(page.getByText("No equipment yet. Add items below.")).toBeVisible();
	});
});
