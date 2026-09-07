import { expect, test } from "@playwright/test";
import { openInventoryTab } from "./character-detail-helpers.js";

test("mobile item editor keeps actions reachable and focuses invalid fields", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 740 });
	await page.goto("/");
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name", { exact: true }).fill("Mobile inventory editor");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard", exact: true }).click();
	await page.getByRole("button", { name: "Create character", exact: true }).click();
	await openInventoryTab(page);
	await page
		.getByTestId("personal-inventory")
		.getByRole("button", { name: "Add item", exact: true })
		.click();
	const dialog = page.getByRole("dialog", { name: "Add personal item" });
	const scrollBody = dialog.locator(".inventory-editor-scroll");
	const save = dialog.getByRole("button", { name: "Add item", exact: true });
	for (const width of [320, 390]) {
		await page.setViewportSize({ width, height: 740 });
		await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(width);
		await expect.poll(async () => (await dialog.boundingBox())?.y).toBe(0);
		await expect(save).toBeInViewport();
		await scrollBody.evaluate((element) => {
			element.scrollTop = element.scrollHeight;
		});
		await expect(save).toBeInViewport();
		await expect(dialog.getByLabel("Thumbnail URL")).toBeInViewport();
		const bounds = await save.boundingBox();
		expect(bounds?.height).toBeGreaterThanOrEqual(44);
		expect(bounds?.width).toBeGreaterThanOrEqual(44);
	}
	await dialog.getByLabel("Name", { exact: true }).fill("   ");
	await scrollBody.evaluate((element) => {
		element.scrollTop = element.scrollHeight;
	});
	await save.click();
	await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
	await expect(dialog.getByLabel("Name", { exact: true })).toBeInViewport();
	await expect(save).toBeInViewport();
	await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText("No personal items yet")).toBeVisible();
});
