import { expect, test } from "@playwright/test";

test("mobile workspace keeps real section routes, browsing state, and reachable app chrome", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Mira Navigation");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard" }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Mira Navigation" })).toBeVisible();
	const characterPath = new URL(page.url()).pathname;
	const navigation = page.getByRole("navigation", { name: "Character sections" });
	const spells = navigation.getByRole("link", { name: "Spells & Abilities" });
	const inventory = navigation.getByRole("link", { name: "Inventory" });
	await expect(page.locator("footer")).toHaveCount(0);
	await expect(navigation.getByRole("link")).toHaveCount(2);
	await inventory.click();
	await expect(page).toHaveURL(`${process.env.WEB_URL}${characterPath}/inventory`);
	await page.getByRole("textbox", { name: "Search personal inventory" }).fill("retained search");
	await spells.click();
	await expect(page.getByTestId("personal-inventory")).toHaveCount(0);
	await page.goBack();
	await expect(inventory).toHaveAttribute("aria-current", "page");
	await expect(page.getByRole("textbox", { name: "Search personal inventory" })).toHaveValue(
		"retained search",
	);
	await page.goForward();
	await expect(spells).toHaveAttribute("aria-current", "page");
	await page.reload();
	await expect(spells).toHaveAttribute("aria-current", "page");
	await page.getByRole("button", { name: "Open application menu" }).click();
	await expect(page.getByRole("menuitem", { name: "Sign in" })).toBeVisible();
	await page.getByRole("menuitem", { name: "About", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "About" })).toContainText("unofficial service");
	await page.keyboard.press("Escape");
	for (const viewport of [
		{ width: 320, height: 740 },
		{ width: 390, height: 844 },
		{ width: 1280, height: 900 },
	]) {
		await page.setViewportSize(viewport);
		await page.evaluate(() => window.scrollTo(0, 0));
		await expect(navigation).toBeVisible();
		const box = await navigation.boundingBox();
		expect(box).not.toBeNull();
		if (viewport.width < 768 && box) {
			expect(Math.round(box.y + box.height)).toBe(viewport.height);
			expect(box.height).toBeGreaterThanOrEqual(56);
			expect(box.height).toBeLessThanOrEqual(66);
		}
		await page.screenshot({ path: testInfo.outputPath(`shell-${viewport.width}-top.png`) });
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.screenshot({ path: testInfo.outputPath(`shell-${viewport.width}-scrolled.png`) });
	}
	await page.goto(
		`${process.env.WEB_URL}/characters/00000000-0000-4000-8000-000000000000/inventory`,
	);
	await expect(page.getByText("Character not found", { exact: true })).toBeVisible();
	await expect(page.getByRole("link", { name: "Back to characters" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Open application menu" })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("shell-not-found.png") });
});
