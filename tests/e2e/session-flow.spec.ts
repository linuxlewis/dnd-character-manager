import { expect, test } from "@playwright/test";

test("creates and reuses the browser session on reload", async ({ page }) => {
	await page.goto("/");

	const sessionUser = page.getByText(/^Session user /);
	await expect(sessionUser).toBeVisible();
	const firstSessionUser = await sessionUser.textContent();
	expect(firstSessionUser).toMatch(
		/^Session user [0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	await page.reload();
	await expect(page.getByText(firstSessionUser ?? "")).toBeVisible();
});
