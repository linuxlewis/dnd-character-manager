import { expect, type Page, test } from "@playwright/test";

test("reconciles committed add and spend operations after lost confirmation responses", async ({
	page,
}) => {
	const addGate = createReconciliationGate();
	const spendGate = createReconciliationGate();
	const pendingReconciliations: ReconciliationGate[] = [];
	let addMutations = 0;
	let spendMutations = 0;
	let addPreviews = 0;
	let spendPreviews = 0;

	await page.route("**/api/characters/*/treasury", async (route) => {
		if (route.request().method() === "GET") {
			const gate = pendingReconciliations.shift();
			if (gate) {
				gate.markStarted();
				await gate.waitForRelease;
			}
			return route.continue();
		}
		if (route.request().method() !== "PUT") return route.continue();

		addMutations += 1;
		const response = await route.fetch();
		if (addMutations !== 2) return route.fulfill({ response });
		pendingReconciliations.push(addGate);
		return route.fulfill({
			body: JSON.stringify({ error: "Add confirmation response was lost." }),
			contentType: "application/json",
			response,
			status: 503,
		});
	});
	await page.route("**/api/characters/*/treasury/spend", async (route) => {
		if (route.request().method() !== "POST") return route.continue();

		spendMutations += 1;
		const response = await route.fetch();
		if (spendMutations !== 1) return route.fulfill({ response });
		pendingReconciliations.push(spendGate);
		return route.fulfill({
			body: JSON.stringify({ error: "Spend confirmation response was lost." }),
			contentType: "application/json",
			response,
			status: 503,
		});
	});
	await page.route("**/api/characters/*/treasury/preview/add", async (route) => {
		addPreviews += 1;
		return route.continue();
	});
	await page.route("**/api/characters/*/treasury/preview/spend", async (route) => {
		spendPreviews += 1;
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Reconciliation Recovery", "Fighter");
	await addFunds(page, 5);
	await expectBalances(page, "5.00 GP");

	const addDialog = await previewAdd(page, 1);
	await addDialog.getByRole("button", { name: "Confirm add funds" }).click();
	await expect(addDialog.getByText("Add funds failed")).toBeVisible();
	await expect(addDialog.getByRole("button", { name: "Preview add" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Spend", exact: true })).toBeDisabled();
	await addGate.started;
	await expect(addDialog.getByRole("button", { name: "Preview add" })).toBeDisabled();
	addGate.release();
	await expect(addDialog.getByRole("button", { name: "Preview add" })).toBeEnabled();
	await expectBalances(page, "6.00 GP");
	await addDialog.getByRole("button", { name: "Preview add" }).click();
	await expect(addDialog.getByRole("button", { name: "Confirm add funds" })).toBeVisible();
	await expect(addPreviews).toBe(5);
	await addDialog.getByRole("button", { name: "Cancel" }).click();

	const spendDialog = await previewSpend(page, 2);
	await spendDialog.getByRole("button", { name: "Confirm spend" }).click();
	await expect(spendDialog.getByText("Spend funds failed")).toBeVisible();
	await expect(spendDialog.getByRole("button", { name: "Preview spend" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Add funds", exact: true })).toBeDisabled();
	await spendGate.started;
	await expect(spendDialog.getByRole("button", { name: "Preview spend" })).toBeDisabled();
	spendGate.release();
	await expect(spendDialog.getByRole("button", { name: "Preview spend" })).toBeEnabled();
	await expectBalances(page, "4.00 GP");
	await spendDialog.getByRole("button", { name: "Preview spend" }).click();
	await expect(spendDialog.getByRole("button", { name: "Confirm spend" })).toBeVisible();
	await expect(spendPreviews).toBe(3);
	await spendDialog.getByRole("button", { name: "Cancel" }).click();

	expect(addMutations).toBe(2);
	expect(spendMutations).toBe(1);
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

async function previewAdd(page: Page, amount: number) {
	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add funds" });
	await dialog.getByLabel("Gold pieces (GP)").fill(String(amount));
	await dialog.getByRole("button", { name: "Preview add" }).click();
	await expect(dialog.getByRole("button", { name: "Confirm add funds" })).toBeVisible();
	return dialog;
}

async function previewSpend(page: Page, amount: number) {
	await page.getByRole("button", { name: "Spend", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Spend funds" });
	await dialog.getByLabel("Amount").fill(String(amount));
	await dialog.getByRole("button", { name: "Preview spend" }).click();
	await expect(dialog.getByRole("button", { name: "Confirm spend" })).toBeVisible();
	return dialog;
}

async function expectBalances(page: Page, total: string) {
	await expect(page.getByTestId("treasury-gp-balance").getByText(/\d/)).toBeVisible();
	await expect(page.getByTestId("treasury-total")).toContainText(total);
}

type ReconciliationGate = ReturnType<typeof createReconciliationGate>;

function createReconciliationGate() {
	let markStarted!: () => void;
	let release!: () => void;
	const started = new Promise<void>((resolve) => {
		markStarted = resolve;
	});
	const waitForRelease = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { markStarted, release, started, waitForRelease };
}
