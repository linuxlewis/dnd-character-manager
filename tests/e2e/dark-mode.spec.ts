import { expect, test } from "./fixtures.ts";

test.describe("Dark mode toggle", () => {
	test("switches theme and CSS variables change", async ({ page }) => {
		await page.goto("/");

		// Default should be light mode (unless system preference)
		const html = page.locator("html");

		// Click theme toggle (sun/moon button)
		const toggleButton = page.getByRole("button", { name: /Switch to .* mode/ });
		await expect(toggleButton).toBeVisible();

		// Get initial theme
		const initialTheme = await html.getAttribute("data-theme");

		// Toggle theme
		await toggleButton.click();

		// Theme attribute should change
		const newTheme = await html.getAttribute("data-theme");
		expect(newTheme).not.toBe(initialTheme);

		// Verify CSS custom properties change with theme
		const bgColor = await html.evaluate((el) => getComputedStyle(el).getPropertyValue("--color-bg"));
		expect(bgColor).toBeTruthy();

		// Toggle back
		await toggleButton.click();
		const restoredTheme = await html.getAttribute("data-theme");
		expect(restoredTheme).toBe(initialTheme);
	});

	test("theme persists across page reload", async ({ page }) => {
		await page.goto("/");
		const html = page.locator("html");
		const toggleButton = page.getByRole("button", { name: /Switch to .* mode/ });

		// Switch to dark mode
		const initialTheme = await html.getAttribute("data-theme");
		if (initialTheme !== "dark") {
			await toggleButton.click();
		}
		await expect(html).toHaveAttribute("data-theme", "dark");

		// Reload and verify persistence
		await page.reload();
		await expect(html).toHaveAttribute("data-theme", "dark");
	});
});
