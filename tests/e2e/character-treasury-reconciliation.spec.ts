import { expect, type Page, test } from "@playwright/test";

test("reconciles committed add and spend operations after lost responses", async ({ page }) => {
	const addGate = createReconciliationGate();
	const spendGate = createReconciliationGate();
	const pendingReconciliations: ReconciliationGate[] = [];
	let addMutations = 0;
	let spendMutations = 0;
	let previewAttempts = 0;

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
			body: JSON.stringify({ error: "Add funds response was lost." }),
			contentType: "application/json",
			response,
			status: 503,
		});
	});
	await page.route("**/api/characters/*/treasury/spend", async (route) => {
		if (route.request().method() !== "POST") return route.continue();

		spendMutations += 1;
		const response = await route.fetch();
		pendingReconciliations.push(spendGate);
		return route.fulfill({
			body: JSON.stringify({ error: "Spend funds response was lost." }),
			contentType: "application/json",
			response,
			status: 503,
		});
	});
	await page.route("**/api/characters/*/treasury/preview/*", async (route) => {
		previewAttempts += 1;
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Reconciliation Recovery", "Fighter");
	await addFunds(page, 5);
	await expectBalances(page, "5.00 GP");

	const addDialog = await submitAdd(page, 1);
	await expect(addDialog.getByText("Add funds failed")).toBeVisible();
	await addGate.started;
	await expect(addDialog.getByRole("button", { name: "Add funds", exact: true })).toBeDisabled();
	addGate.release();
	await expect(addDialog).toBeHidden();
	await expectBalances(page, "6.00 GP");
	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	await expect(
		page.getByRole("dialog", { name: "Add funds" }).getByLabel("Gold pieces (GP)"),
	).toHaveValue("");
	await page
		.getByRole("dialog", { name: "Add funds" })
		.getByRole("button", { name: "Cancel" })
		.click();

	const spendDialog = await submitSpend(page, 2);
	await expect(spendDialog.getByText("Spend failed")).toBeVisible();
	await spendGate.started;
	await expect(spendDialog.getByRole("button", { name: "Spend", exact: true })).toBeDisabled();
	spendGate.release();
	await expect(spendDialog).toBeHidden();
	await expectBalances(page, "4.00 GP");
	await page.getByRole("button", { name: "Spend", exact: true }).click();
	await expect(
		page.getByRole("dialog", { name: "Spend funds" }).getByLabel("Gold pieces (GP)"),
	).toHaveValue("");
	await page
		.getByRole("dialog", { name: "Spend funds" })
		.getByRole("button", { name: "Cancel" })
		.click();

	expect(addMutations).toBe(2);
	expect(spendMutations).toBe(1);
	expect(previewAttempts).toBe(0);
});

test("requires balance review when a lost add response is overtaken before reconciliation", async ({
	page,
}) => {
	let addMutations = 0;
	let previewAttempts = 0;
	await page.route("**/api/characters/*/treasury", async (route) => {
		if (route.request().method() !== "PUT") return route.continue();

		addMutations += 1;
		const response = await route.fetch();
		if (addMutations !== 2) return route.fulfill({ response });

		const committed = (await response.json()) as {
			treasury: { balances: { cp: number; sp: number; gp: number; pp: number } };
		};
		const interveningResponse = await route.fetch({
			postData: JSON.stringify({
				delta: { cp: 0, sp: 0, gp: 2, pp: 0 },
				expectedPrevious: committed.treasury.balances,
			}),
		});
		if (!interveningResponse.ok()) {
			throw new Error(`Intervening treasury mutation failed: ${interveningResponse.status()}`);
		}
		return route.fulfill({
			body: JSON.stringify({ error: "Add funds response was lost." }),
			contentType: "application/json",
			status: 503,
		});
	});
	await page.route("**/api/characters/*/treasury/preview/*", async (route) => {
		previewAttempts += 1;
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Indeterminate Recovery", "Fighter");
	await addFunds(page, 5);
	const dialog = await submitAdd(page, 1);

	await expect(dialog).toBeHidden();
	await expectBalances(page, "8.00 GP");
	const warning = page.getByRole("alert").filter({
		hasText: "Treasury confirmation could not be verified",
	});
	await expect(warning).toContainText("response was lost");
	await expect(warning).toContainText("displayed balance is authoritative");
	const addButton = page.getByRole("button", { name: "Add funds", exact: true });
	const spendButton = page.getByRole("button", { name: "Spend", exact: true });
	await expect(addButton).toBeDisabled();
	await expect(spendButton).toBeDisabled();
	await expect(previewAttempts).toBe(0);

	await warning.getByRole("button", { name: "I reviewed the balance" }).click();
	await expect(warning).toBeHidden();
	await addButton.click();
	const freshDialog = page.getByRole("dialog", { name: "Add funds" });
	await expect(freshDialog.getByLabel("Gold pieces (GP)")).toHaveValue("");
	await freshDialog.getByRole("button", { name: "Cancel" }).click();
	await expect(addMutations).toBe(2);
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

async function submitAdd(page: Page, amount: number) {
	await page.getByRole("button", { name: "Add funds", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add funds" });
	await dialog.getByLabel("Gold pieces (GP)").fill(String(amount));
	await dialog.getByRole("button", { name: "Add funds", exact: true }).click();
	return dialog;
}

async function submitSpend(page: Page, amount: number) {
	await page.getByRole("button", { name: "Spend", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Spend funds" });
	await dialog.getByLabel("Gold pieces (GP)").fill(String(amount));
	await dialog.getByRole("button", { name: "Spend", exact: true }).click();
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
