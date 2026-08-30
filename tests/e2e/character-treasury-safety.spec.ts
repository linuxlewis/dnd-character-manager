import { expect, type Page, test } from "@playwright/test";

test("recovers a failed reconciliation without replaying the mutation", async ({ page }) => {
	let mutationCount = 0;
	let treasuryGets = 0;
	let failNextReconciliation = false;
	let allowReconciliation = false;
	await page.route("**/api/characters/*/treasury", async (route) => {
		if (route.request().method() === "GET") {
			treasuryGets += 1;
			if (failNextReconciliation && !allowReconciliation) {
				return route.fulfill({
					body: JSON.stringify({ error: "Treasury reconciliation is temporarily unavailable." }),
					contentType: "application/json",
					status: 503,
				});
			}
			return route.continue();
		}
		if (route.request().method() !== "PUT") return route.continue();

		mutationCount += 1;
		const response = await route.fetch();
		failNextReconciliation = true;
		return route.fulfill({ response });
	});

	await page.goto("/");
	await createCharacter(page, "Reconciliation Retry", "Fighter");
	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add funds" });
	await dialog.getByLabel("Gold pieces (GP)").fill("1");
	await dialog.getByRole("button", { name: "Add funds", exact: true }).click();

	await expect(dialog.getByText("Treasury reconciliation failed")).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Retry treasury reconciliation" })).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Add funds", exact: true })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Spend", exact: true })).toBeDisabled();
	expect(mutationCount).toBe(1);

	allowReconciliation = true;
	await dialog.getByRole("button", { name: "Retry treasury reconciliation" }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByTestId("treasury-total")).toContainText("1.00 GP");
	expect(mutationCount).toBe(1);
	expect(treasuryGets).toBeGreaterThan(2);
});

test("rejects a stale add mutation and allows a fresh one-step submit", async ({ page }) => {
	let addMutations = 0;
	let previewAttempts = 0;
	await page.route("**/api/characters/*/treasury", async (route) => {
		if (route.request().method() !== "PUT") return route.continue();
		addMutations += 1;
		return route.continue();
	});
	await page.route("**/api/characters/*/treasury/preview/*", async (route) => {
		previewAttempts += 1;
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Add Freshness", "Fighter");
	const characterId = characterIdFromPage(page);
	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add funds" });
	await dialog.getByLabel("Gold pieces (GP)").fill("1");

	await externalAdd(page, characterId, 2);
	await dialog.getByRole("button", { name: "Add funds", exact: true }).click();
	await expect(dialog.getByText("Treasury changed before save")).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Add funds", exact: true })).toBeEnabled();
	await expect(page.getByTestId("treasury-total")).toContainText("2.00 GP");
	expect(addMutations).toBe(2);
	expect(previewAttempts).toBe(0);

	await dialog.getByRole("button", { name: "Add funds", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByTestId("treasury-total")).toContainText("3.00 GP");
	expect(addMutations).toBe(3);
});

test("rejects a stale spend mutation and allows a fresh one-step submit", async ({ page }) => {
	let addMutations = 0;
	let spendMutations = 0;
	let previewAttempts = 0;
	await page.route("**/api/characters/*/treasury", async (route) => {
		if (route.request().method() !== "PUT") return route.continue();
		addMutations += 1;
		return route.continue();
	});
	await page.route("**/api/characters/*/treasury/spend", async (route) => {
		if (route.request().method() !== "POST") return route.continue();
		spendMutations += 1;
		return route.continue();
	});
	await page.route("**/api/characters/*/treasury/preview/*", async (route) => {
		previewAttempts += 1;
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Spend Freshness", "Fighter");
	const characterId = characterIdFromPage(page);
	await addFunds(page, 5);
	await page.getByRole("button", { name: "Spend", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Spend funds" });
	await dialog.getByLabel("Gold pieces (GP)").fill("1");

	await externalAdd(page, characterId, 2);
	await dialog.getByRole("button", { name: "Spend", exact: true }).click();
	await expect(dialog.getByText("Treasury changed before save")).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Spend", exact: true })).toBeEnabled();
	await expect(page.getByTestId("treasury-total")).toContainText("7.00 GP");
	expect(spendMutations).toBe(1);
	expect(previewAttempts).toBe(0);

	await dialog.getByRole("button", { name: "Spend", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByTestId("treasury-total")).toContainText("6.00 GP");
	expect(addMutations).toBe(2);
	expect(spendMutations).toBe(2);
});

async function createCharacter(page: Page, name: string, className: string) {
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill(name);
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: className }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function addFunds(page: Page, amount: number) {
	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add funds" });
	await dialog.getByLabel("Gold pieces (GP)").fill(String(amount));
	await dialog.getByRole("button", { name: "Add funds", exact: true }).click();
	await expect(dialog).toBeHidden();
}

async function externalAdd(page: Page, characterId: string, amount: number) {
	const result = await page.evaluate(
		async ({ id, value }) => {
			const currentResponse = await fetch(`/api/characters/${id}/treasury`);
			const current = await currentResponse.json();
			const response = await fetch(`/api/characters/${id}/treasury`, {
				body: JSON.stringify({
					delta: { cp: 0, sp: 0, gp: value, pp: 0 },
					expectedPrevious: current.treasury.balances,
				}),
				headers: { "Content-Type": "application/json" },
				method: "PUT",
			});
			return { body: await response.json(), status: response.status };
		},
		{ id: characterId, value: amount },
	);
	expect(result.status).toBe(200);
}

function characterIdFromPage(page: Page) {
	return new URL(page.url()).pathname.split("/").at(-1) ?? "";
}
