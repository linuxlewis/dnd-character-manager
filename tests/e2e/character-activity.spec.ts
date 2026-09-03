import { expect, type Page, type Route, test } from "@playwright/test";
import { openInventoryTab } from "./character-detail-helpers.js";

const historyIdPrefix = "00000000-0000-4000-8000-";

test("opens activity, filters pages, and rebuilds loaded pages after an item mutation", async ({
	page,
}) => {
	let historyRefreshed = false;
	const historyRequests: string[] = [];

	await page.route("**/api/characters/*/history**", async (route) => {
		const requestUrl = new URL(route.request().url());
		const offset = Number(requestUrl.searchParams.get("offset") ?? 0);
		const limit = Number(requestUrl.searchParams.get("limit") ?? 20);
		const entityType = requestUrl.searchParams.get("entityType");
		historyRequests.push(requestUrl.search);

		if (entityType === "currency") {
			return fulfillHistory(route, [treasuryEntry()], 1, limit, offset, false);
		}
		if (entityType === "item") {
			return fulfillHistory(route, itemEntries(20), 20, limit, offset, false);
		}
		if (limit === 1) {
			return fulfillHistory(
				route,
				historyRefreshed ? [mutationEntry()] : [itemEntry(0)],
				historyRefreshed ? 23 : 22,
				limit,
				offset,
				false,
			);
		}

		const entries = historyRefreshed
			? offset === 0
				? [mutationEntry(), ...itemEntries(19)]
				: [...itemEntries(2, 19), malformedEntry()]
			: offset === 0
				? itemEntries(20)
				: [itemEntry(20), malformedEntry()];
		return fulfillHistory(route, entries, historyRefreshed ? 23 : 22, limit, offset, offset === 0);
	});
	await page.route("**/api/characters/*/items", async (route) => {
		if (route.request().method() !== "POST") return route.continue();
		const response = await route.fetch();
		historyRefreshed = true;
		return route.fulfill({ response });
	});

	await page.goto("/");
	await createCharacter(page, `Activity Mutation ${Date.now()}`, "Fighter");
	await openInventoryTab(page);
	const preview = page.getByRole("button", { name: "View inventory activity" });
	await expect(preview).toBeVisible();
	await expect(preview.getByText("Added Ledger Item 00", { exact: true })).toBeVisible();
	await preview.click();

	const drawer = page.getByRole("dialog", { name: "Inventory activity" });
	await expect(drawer).toBeVisible();
	await expect(drawer.getByRole("radio", { name: "All", exact: true })).toBeChecked();
	await expect(drawer.getByText("Added Ledger Item 19", { exact: true })).toBeVisible();
	await drawer.getByRole("button", { name: "Load more activity", exact: true }).click();
	await expect(drawer.getByText("Added Ledger Item 20", { exact: true })).toBeVisible();
	await expect(
		drawer.getByText("This activity entry cannot be displayed.", { exact: true }),
	).toBeVisible();

	const itemRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/history?") &&
			new URL(request.url()).searchParams.get("entityType") === "item",
	);
	await drawer.getByText("Items", { exact: true }).click();
	await itemRequest;
	await expect(drawer.getByRole("radio", { name: "Items", exact: true })).toBeChecked();
	await expect(drawer.getByText("Added 1 GP", { exact: true })).toBeHidden();

	const treasuryRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/history?") &&
			new URL(request.url()).searchParams.get("entityType") === "currency",
	);
	await drawer.getByText("Treasury", { exact: true }).click();
	await treasuryRequest;
	await expect(drawer.getByText("Added 1 GP", { exact: true })).toBeVisible();

	await drawer.getByText("All", { exact: true }).click();
	await drawer.getByRole("button", { name: "Load more activity", exact: true }).click();
	await expect(drawer.getByText("Added Ledger Item 20", { exact: true })).toBeVisible();
	await drawer.getByRole("button", { name: "Close inventory activity", exact: true }).click();
	await expect(preview).toBeFocused();

	const inventory = page.getByTestId("personal-inventory");
	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const addDialog = page.getByRole("dialog", { name: "Add personal item" });
	await addDialog.getByLabel("Name").fill("Mutation trigger");
	await addDialog.getByLabel("Category").fill("Testing");
	await addDialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(addDialog).toBeHidden();

	await expect(preview.getByText("Added Mutation trigger", { exact: true })).toBeVisible();
	await preview.click();
	await expect(drawer.getByText("Added Mutation trigger", { exact: true })).toBeVisible();
	for (let index = 0; index <= 20; index += 1) {
		await expect(
			drawer.getByText(`Added Ledger Item ${String(index).padStart(2, "0")}`, { exact: true }),
		).toHaveCount(1);
	}
	await expect(drawer.getByText("Added Mutation trigger", { exact: true })).toHaveCount(1);
	await expect(
		drawer.getByText("This activity entry cannot be displayed.", { exact: true }),
	).toHaveCount(1);
	await expect(historyRequests.some((request) => request.includes("offset=20"))).toBe(true);

	await page.setViewportSize({ width: 390, height: 844 });
	const mobileDrawer = await drawer.boundingBox();
	const viewport = page.viewportSize();
	expect(mobileDrawer).not.toBeNull();
	expect(viewport).not.toBeNull();
	if (mobileDrawer && viewport) expect(mobileDrawer.width).toBe(viewport.width);
});

test("keeps loaded activity during a failed page and retries the page boundary", async ({
	page,
}) => {
	let failed = false;
	await page.route("**/api/characters/*/history**", async (route) => {
		const requestUrl = new URL(route.request().url());
		const offset = Number(requestUrl.searchParams.get("offset") ?? 0);
		const limit = Number(requestUrl.searchParams.get("limit") ?? 20);
		if (offset === 20 && !failed) {
			failed = true;
			return route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Activity page unavailable" }),
			});
		}
		const entries = offset === 0 ? itemEntries(20) : [itemEntry(20)];
		return fulfillHistory(route, entries, 21, limit, offset, offset === 0);
	});

	await page.goto("/");
	await createCharacter(page, `Activity Retry ${Date.now()}`, "Fighter");
	await openInventoryTab(page);
	await page.getByRole("button", { name: "View inventory activity" }).click();
	const drawer = page.getByRole("dialog", { name: "Inventory activity" });
	await drawer.getByRole("button", { name: "Load more activity", exact: true }).click();
	await expect(drawer.getByText("Added Ledger Item 00", { exact: true })).toBeVisible();
	await expect(drawer.getByText("More activity unavailable", { exact: true })).toBeVisible();
	await drawer.getByRole("button", { name: "Try loading more", exact: true }).click();
	await expect(drawer.getByText("Added Ledger Item 20", { exact: true })).toBeVisible();
});

test("retries the preview and resets the filter for another character", async ({ page }) => {
	let previewFailed = true;
	await page.route("**/api/characters/*/history**", async (route) => {
		const requestUrl = new URL(route.request().url());
		const limit = Number(requestUrl.searchParams.get("limit") ?? 20);
		if (limit === 1 && previewFailed) {
			previewFailed = false;
			return route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Activity unavailable" }),
			});
		}
		return fulfillHistory(route, [itemEntry(0)], 1, limit, 0, false);
	});

	await page.goto("/");
	await createCharacter(page, `Activity First ${Date.now()}`, "Fighter");
	await openInventoryTab(page);
	await expect(page.getByText("Activity unavailable", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Retry activity", exact: true }).click();
	const firstPreview = page.getByRole("button", { name: "View inventory activity" });
	await expect(firstPreview).toBeVisible();
	await firstPreview.click();
	const firstDrawer = page.getByRole("dialog", { name: "Inventory activity" });
	await firstDrawer.getByText("Treasury", { exact: true }).click();
	await expect(firstDrawer.getByRole("radio", { name: "Treasury", exact: true })).toBeChecked();
	await firstDrawer.getByRole("button", { name: "Close inventory activity", exact: true }).click();

	await page.getByText("Back to characters").click();
	await createCharacter(page, `Activity Second ${Date.now()}`, "Wizard");
	await openInventoryTab(page);
	await page.getByRole("button", { name: "View inventory activity" }).click();
	const secondDrawer = page.getByRole("dialog", { name: "Inventory activity" });
	await expect(secondDrawer.getByRole("radio", { name: "All", exact: true })).toBeChecked();
	await expect(secondDrawer.getByText("Activity Second", { exact: false })).toBeVisible();
});

async function fulfillHistory(
	route: Route,
	entries: readonly Record<string, unknown>[],
	total: number,
	limit: number,
	offset: number,
	hasMore: boolean,
) {
	return route.fulfill({
		contentType: "application/json",
		body: JSON.stringify({ entries, total, limit, offset, hasMore }),
		status: 200,
	});
}

function itemEntries(count: number, start = 0) {
	return Array.from({ length: count }, (_, index) => itemEntry(start + index));
}

function itemEntry(index: number) {
	const itemId = `${historyIdPrefix}${String(index + 201).padStart(12, "0")}`;
	return {
		id: `${historyIdPrefix}${String(index + 101).padStart(12, "0")}`,
		entityId: itemId,
		entityName: `Ledger Item ${String(index).padStart(2, "0")}`,
		entityType: "item",
		action: "item_added",
		actorUserId: null,
		createdAt: new Date(Date.now() - index * 60_000).toISOString(),
		details: {
			version: 1,
			item: {
				id: itemId,
				name: `Ledger Item ${String(index).padStart(2, "0")}`,
				type: "misc",
				category: "Testing",
				rarity: null,
				quantity: 1,
				weight: null,
				estimatedValue: null,
				isEquipped: false,
			},
		},
	};
}

function mutationEntry() {
	const entry = itemEntry(99);
	return {
		...entry,
		id: `${historyIdPrefix}000000000099`,
		entityId: `${historyIdPrefix}000000000299`,
		entityName: "Mutation trigger",
		details: {
			...entry.details,
			item: {
				...entry.details.item,
				id: `${historyIdPrefix}000000000299`,
				name: "Mutation trigger",
			},
		},
	};
}

function malformedEntry() {
	return {
		id: `${historyIdPrefix}000000000098`,
		entityId: `${historyIdPrefix}000000000298`,
		entityName: "Unreadable record",
		entityType: "item",
		action: "item_added",
		actorUserId: null,
		createdAt: new Date(Date.now() - 21 * 60_000).toISOString(),
		details: { version: 2, item: {} },
	};
}

function treasuryEntry() {
	return {
		id: `${historyIdPrefix}000000000097`,
		entityId: null,
		entityName: null,
		entityType: "currency",
		action: "currency_updated",
		actorUserId: null,
		createdAt: new Date().toISOString(),
		details: {
			version: 1,
			operation: "add",
			previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
			next: { cp: 0, sp: 0, gp: 1, pp: 0 },
			delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
			requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
			note: null,
		},
	};
}

async function createCharacter(page: Page, name: string, className: string) {
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill(name);
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: className }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name })).toBeVisible();
}
