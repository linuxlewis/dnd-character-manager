import { expect, type Locator, type Page, test } from "@playwright/test";

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
	await dialog.getByRole("button", { name: "Preview add" }).click();
	await dialog.getByRole("button", { name: "Confirm add funds" }).click();

	await expect(dialog.getByText("Treasury reconciliation failed")).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Retry treasury reconciliation" })).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Preview add" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Spend", exact: true })).toBeDisabled();
	expect(mutationCount).toBe(1);

	allowReconciliation = true;
	await dialog.getByRole("button", { name: "Retry treasury reconciliation" }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByTestId("treasury-total")).toContainText("1.00 GP");
	expect(mutationCount).toBe(1);
	expect(treasuryGets).toBeGreaterThan(2);
});

test("requires a fresh add preview after an external balance change", async ({ page }) => {
	let addMutations = 0;
	let addPreviews = 0;
	await page.route("**/api/characters/*/treasury", async (route) => {
		if (route.request().method() !== "PUT") return route.continue();
		addMutations += 1;
		return route.continue();
	});
	await page.route("**/api/characters/*/treasury/preview/add", async (route) => {
		addPreviews += 1;
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Add Freshness", "Fighter");
	const characterId = characterIdFromPage(page);
	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add funds" });
	await dialog.getByLabel("Gold pieces (GP)").fill("1");
	await dialog.getByRole("button", { name: "Preview add" }).click();

	await externalAdd(page, characterId, 2);
	await dialog.getByRole("button", { name: "Confirm add funds" }).click();
	await expectPreviewBalance(dialog, "Previous balances", "GP", "2");
	await expectPreviewBalance(dialog, "Next balances", "GP", "3");
	expect(addMutations).toBe(1);
	expect(addPreviews).toBe(2);

	await dialog.getByRole("button", { name: "Confirm add funds" }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByTestId("treasury-total")).toContainText("3.00 GP");
	expect(addMutations).toBe(2);
	expect(addPreviews).toBe(3);
});

test("requires a fresh spend preview after an external balance change", async ({ page }) => {
	let addMutations = 0;
	let spendMutations = 0;
	let spendPreviews = 0;
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
	await page.route("**/api/characters/*/treasury/preview/spend", async (route) => {
		spendPreviews += 1;
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Spend Freshness", "Fighter");
	const characterId = characterIdFromPage(page);
	await addFunds(page, 5);
	await page.getByRole("button", { name: "Spend", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Spend funds" });
	await dialog.getByLabel("Amount").fill("1");
	await dialog.getByRole("button", { name: "Preview spend" }).click();

	await externalAdd(page, characterId, 2);
	await dialog.getByRole("button", { name: "Confirm spend" }).click();
	await expectPreviewBalance(dialog, "Previous balances", "GP", "7");
	await expectPreviewBalance(dialog, "Next balances", "GP", "6");
	expect(spendMutations).toBe(0);
	expect(spendPreviews).toBe(2);

	await dialog.getByRole("button", { name: "Confirm spend" }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByTestId("treasury-total")).toContainText("6.00 GP");
	expect(addMutations).toBe(2);
	expect(spendMutations).toBe(1);
	expect(spendPreviews).toBe(3);
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
	await dialog.getByRole("button", { name: "Preview add" }).click();
	await dialog.getByRole("button", { name: "Confirm add funds" }).click();
	await expect(dialog).toBeHidden();
}

async function externalAdd(page: Page, characterId: string, amount: number) {
	const result = await page.evaluate(
		async ({ id, value }) => {
			const response = await fetch(`/api/characters/${id}/treasury`, {
				body: JSON.stringify({ delta: { cp: 0, sp: 0, gp: value, pp: 0 } }),
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

async function expectPreviewBalance(
	dialog: Locator,
	section: string,
	abbreviation: string,
	amount: string,
) {
	const container = dialog.getByText(section, { exact: true }).locator("..");
	await expect(container.getByText(abbreviation, { exact: true }).locator("..")).toContainText(
		amount,
	);
}
