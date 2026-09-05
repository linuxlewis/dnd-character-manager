import { expect, type Page, test } from "@playwright/test";
import { mockCharacterSpellApi } from "../support/character-spell-api.js";

test("reconciles a committed spell-slot action when the response is lost", async ({ page }) => {
	let loseUseResponse = false;
	let useRequests = 0;
	await mockCharacterSpellApi(page);
	await page.route("**/api/characters/*/spell-slots**", async (route) => {
		const request = route.request();
		const pathname = new URL(request.url()).pathname;
		if (request.method() === "POST" && pathname.endsWith("/spell-slots/use")) {
			useRequests += 1;
			if (loseUseResponse) {
				loseUseResponse = false;
				await route.fetch();
				await route.fulfill({
					status: 503,
					contentType: "application/json",
					body: JSON.stringify({ error: "The response was lost." }),
				});
				return;
			}
		}
		await route.continue();
	});

	await openConfiguredSpellSlots(page);
	loseUseResponse = true;
	await page.getByRole("button", { name: "Use 1st-level" }).click();

	await expect(page.getByText("Spell slot action applied")).toBeVisible();
	await expect(page.getByText(/response was lost/)).toBeVisible();
	await expect(page.getByText("1 / 2 remaining")).toBeVisible();
	await expect.poll(() => useRequests).toBe(1);
	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("Used 1st-level slot")).toHaveCount(1);
});

test("blocks a blind spell-slot repeat until failed reconciliation is retried", async ({
	page,
}) => {
	let loseUseResponse = false;
	let failReconciliation = false;
	let useRequests = 0;
	await mockCharacterSpellApi(page);
	await page.route("**/api/characters/*/spell-slots**", async (route) => {
		const request = route.request();
		const pathname = new URL(request.url()).pathname;
		if (request.method() === "GET" && pathname.endsWith("/spell-slots") && failReconciliation) {
			failReconciliation = false;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Spell slot reconciliation failed." }),
			});
			return;
		}
		if (request.method() === "POST" && pathname.endsWith("/spell-slots/use")) {
			useRequests += 1;
			if (loseUseResponse) {
				loseUseResponse = false;
				await route.fetch();
				await route.fulfill({
					status: 503,
					contentType: "application/json",
					body: JSON.stringify({ error: "The response was lost." }),
				});
				return;
			}
		}
		await route.continue();
	});

	await openConfiguredSpellSlots(page);
	loseUseResponse = true;
	failReconciliation = true;
	await page.getByRole("button", { name: "Use 1st-level" }).click();

	await expect(page.getByText("Spell slot state could not be verified")).toBeVisible();
	await expect(
		page.getByText(/Do not repeat the action until reconciliation succeeds/),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Use 1st-level" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Retry spell slot reconciliation" })).toBeVisible();
	await page.getByRole("button", { name: "Retry spell slot reconciliation" }).click();

	await expect(page.getByText("1 / 2 remaining")).toBeVisible();
	await expect(page.getByText("Spell slot action applied")).toBeVisible();
	await expect.poll(() => useRequests).toBe(1);
});

async function openConfiguredSpellSlots(page: Page) {
	await page.goto("/");
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Spell Slot Recovery");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard" }).click();
	await page.getByLabel("Level").fill("7");
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Spell Slot Recovery" })).toBeVisible();
	await page.getByRole("link", { name: "Spells & Abilities", exact: true }).click();
	await page.getByRole("button", { name: "Edit spells" }).click();
	await page.getByLabel("1st-level slot total").fill("2");
	await page.getByRole("button", { name: "Apply changes" }).click();
	await expect(page.getByText("2 / 2 remaining")).toBeVisible();
}
