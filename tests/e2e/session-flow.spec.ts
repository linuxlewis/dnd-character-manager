import { expect, test } from "@playwright/test";

test("creates and reuses the browser session on reload", async ({ page }) => {
	await page.goto("/");

	const firstSession = await page.request.get("/api/current-user");
	expect(firstSession.ok()).toBe(true);
	const firstUser = (await firstSession.json()) as { user: { id: string } };
	expect(firstUser.user.id).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);

	await page.reload();

	const secondSession = await page.request.get("/api/current-user");
	expect(secondSession.ok()).toBe(true);
	const secondUser = (await secondSession.json()) as { user: { id: string } };
	expect(secondUser.user.id).toBe(firstUser.user.id);
});
