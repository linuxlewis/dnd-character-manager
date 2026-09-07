import { expect, test } from "@playwright/test";

test("keeps failed health edits unchanged and updates only detail after explicit retry", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Health cache isolation");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Fighter" }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Health cache isolation" })).toBeVisible();
	await expect(page.getByText("10 / 10 HP (Temp HP 0)")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Spell slots", exact: true })).toBeVisible();
	await page.waitForLoadState("networkidle");
	const characterPath = new URL(page.url()).pathname;
	const healthPath = `/api${characterPath}/health`;
	const writes: unknown[] = [];
	const reads: string[] = [];
	page.on("request", (request) => {
		const path = new URL(request.url()).pathname;
		if (request.method() === "GET" && path.startsWith("/api/characters")) reads.push(path);
	});
	let fail = true;
	await page.route(`**${healthPath}`, async (route) => {
		writes.push(route.request().postDataJSON());
		if (fail)
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: '{"error":"Health write unavailable"}',
			});
		else await route.continue();
	});
	await page.getByRole("button", { name: /History/ }).click();
	await expect(page.getByText("No health changes yet.")).toBeVisible();
	await page.getByRole("button", { name: "Damage", exact: true }).click();
	await page.getByLabel("Amount").fill("3");
	await page.getByRole("button", { name: "Save", exact: true }).click();
	await expect(page.getByText("Health update failed")).toBeVisible();
	await expect(page.getByText("10 / 10 HP (Temp HP 0)")).toBeVisible();
	await expect(page.getByText("No health changes yet.")).toBeVisible();
	// Observe beyond the usual first retry delay before the user explicitly resubmits.
	await page.waitForTimeout(1_200);
	expect(writes).toEqual([{ currentHp: 7, maxHp: 10, temporaryHp: 0 }]);
	expect(reads).toEqual([]);
	fail = false;
	await page.getByRole("button", { name: "Save", exact: true }).click();
	await expect(page.getByText("7 / 10 HP (Temp HP 0)")).toBeVisible();
	await expect(page.getByText("HP -3", { exact: true })).toBeVisible();
	await expect(page.getByRole("dialog", { name: "Damage", exact: true })).toBeHidden();
	await expect(page.getByText("Health update failed")).toBeHidden();
	await page.waitForLoadState("networkidle");
	expect(writes).toEqual([
		{ currentHp: 7, maxHp: 10, temporaryHp: 0 },
		{ currentHp: 7, maxHp: 10, temporaryHp: 0 },
	]);
	expect(reads).toEqual([]);
	await expect(page.getByTestId("personal-inventory")).toHaveCount(0);
});
