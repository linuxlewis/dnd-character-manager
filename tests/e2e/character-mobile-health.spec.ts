import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1280]) {
	test(`compact identity and health recovery at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: width === 320 ? 740 : 900 });
		await page.goto("/");
		await page.getByText("Create character").first().click();
		await page.getByLabel("Name", { exact: true }).fill("Mira Thorn");
		await page.getByRole("combobox", { name: "Class" }).click();
		await page.getByRole("option", { name: "Wizard" }).click();
		await page.getByLabel("Level", { exact: true }).fill("3");
		await page.getByRole("button", { name: "Create character" }).click();
		await expect(page.getByRole("button", { name: /^Edit health:/ })).toBeVisible();
		await page.getByRole("button", { name: /^Edit health:/ }).click();
		await page.getByLabel("Max HP", { exact: true }).fill("24");
		await page.getByLabel("Temp HP", { exact: true }).fill("3");
		await page.getByRole("button", { name: "Save", exact: true }).click();
		await expect(page.getByRole("button", { name: "Edit health: 27 / 27 HP" })).toBeVisible();
		await page.getByRole("button", { name: "Damage", exact: true }).click();
		await page.getByLabel("Amount", { exact: true }).fill("9");
		await expect(page.getByRole("status")).toContainText("Resulting HP: 18");
		await page.route("**/health", (route) =>
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ message: "Controlled failure" }),
			}),
		);
		await page.getByRole("button", { name: "Apply damage" }).click();
		await expect(page.getByRole("alert")).toContainText("Your amount is kept");
		await expect(page.getByLabel("Amount")).toHaveValue("9");
		await page.unroute("**/health");
		await page.getByRole("button", { name: "Apply damage" }).click();
		await expect(page.getByRole("button", { name: "Edit health: 18 / 27 HP" })).toBeVisible();
		await page.getByRole("button", { name: "Heal", exact: true }).click();
		await page.getByLabel("Amount").fill("99");
		await expect(page.getByRole("status")).toContainText("Resulting HP: 27");
		await page.getByRole("button", { name: "Cancel", exact: true }).click();
		await expect(page.getByRole("button", { name: "Heal", exact: true })).toBeFocused();
		await page.getByRole("button", { name: "Open application menu" }).click();
		await page.getByRole("menuitem", { name: "Edit character", exact: true }).click();
		await page.getByLabel("Character name").fill("Mira Saved");
		await page.getByLabel("Character level").fill("4");
		await page.getByLabel("Experience points").fill("2196");
		await page.route("**/level", (route) =>
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ message: "Controlled level failure" }),
			}),
		);
		await page.getByRole("button", { name: "Save character" }).click();
		await expect(page.getByRole("alert")).toContainText("Name saved");
		await expect(page.getByLabel("Character level")).toHaveValue("4");
		await expect(page.getByLabel("Experience points")).toHaveValue("2,196");
		await page.unroute("**/level");
		await page.getByRole("button", { name: "Save character" }).click();
		await expect(page.getByRole("dialog", { name: "Edit character", exact: true })).toBeHidden();
		await page.getByRole("button", { name: "Open application menu" }).click();
		await page.getByRole("menuitem", { name: "Edit character", exact: true }).click();
		await page.getByLabel("Character name").fill("Discard me");
		await page.getByRole("button", { name: "Cancel", exact: true }).click();
		await page.getByRole("button", { name: "Open application menu" }).click();
		await page.getByRole("menuitem", { name: "Edit character", exact: true }).click();
		await expect(page.getByLabel("Character name")).toHaveValue("Mira Saved");
		await expect(page.getByLabel("Character level")).toHaveValue("4");
	});
}
