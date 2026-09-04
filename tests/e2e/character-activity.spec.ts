import { expect, type Page, type Route, test } from "@playwright/test";
import { openInventoryTab } from "./character-detail-helpers.js";

const historyIdPrefix = "00000000-0000-4000-8000-";

test("opens activity, filters pages, and rebuilds loaded pages after an item mutation", async ({
	page,
}) => {
	let historyRefreshed = false;
	const historyRequests: string[] = [];
	let releaseRefreshedPage!: () => void;
	let refreshedPageBlocked = false;
	let refreshedFirstPageResolved = false;
	const refreshedPage = new Promise<void>((resolve) => {
		releaseRefreshedPage = resolve;
	});

	await page.route("**/api/characters/*/history**", async (route) => {
		const requestUrl = new URL(route.request().url());
		const offset = Number(requestUrl.searchParams.get("offset") ?? 0);
		const limit = Number(requestUrl.searchParams.get("limit") ?? 20);
		const entityType = requestUrl.searchParams.get("entityType");
		historyRequests.push(requestUrl.search);
		if (historyRefreshed && offset === 20 && !refreshedPageBlocked) {
			refreshedPageBlocked = true;
			await refreshedPage;
		}

		if (entityType === "currency") {
			return fulfillHistory(route, [treasuryEntry()], 1, limit, offset, false);
		}
		if (entityType === "item") {
			return fulfillHistory(route, itemEntries(20, 50), 20, limit, offset, false);
		}
		if (limit === 1) {
			return fulfillHistory(
				route,
				historyRefreshed ? [mutationEntry()] : [itemEntry(0)],
				historyRefreshed ? 24 : 23,
				limit,
				offset,
				false,
			);
		}

		const entries = historyRefreshed
			? offset === 0
				? [mutationEntry(), ...itemEntries(18), treasuryEntry()]
				: [...itemEntries(3, 18), malformedEntry()]
			: offset === 0
				? [...itemEntries(19), treasuryEntry()]
				: [itemEntry(19), itemEntry(20), malformedEntry()];
		if (historyRefreshed && offset === 0) refreshedFirstPageResolved = true;
		return fulfillHistory(route, entries, historyRefreshed ? 24 : 23, limit, offset, offset === 0);
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
	const previewTabStops = await preview.evaluate(
		(element) =>
			[...element.querySelectorAll<HTMLElement>("*")].filter((child) => child.tabIndex >= 0).length,
	);
	expect(previewTabStops).toBe(0);
	await preview.focus();
	await expect(preview).toBeFocused();
	await preview.click();

	const drawer = page.getByRole("dialog", { name: "Inventory activity" });
	await expect(drawer).toBeVisible();
	await expect(drawer.getByRole("radio", { name: "All", exact: true })).toBeChecked();
	await expect(drawer.getByText("Added 1 GP", { exact: true })).toBeVisible();
	await expect(drawer.getByText("Added Ledger Item 18", { exact: true })).toBeVisible();
	await expect(
		drawer.getByRole("button", { name: "Close inventory activity", exact: true }),
	).toBeFocused();

	const drawerHeader = drawer.locator(".mantine-Drawer-header");
	const filter = drawer.locator(".character-activity-filter");
	const scrollViewport = drawer.locator(".character-activity-scroll .mantine-ScrollArea-viewport");
	const headerBeforeScroll = await drawerHeader.boundingBox();
	const filterBeforeScroll = await filter.boundingBox();
	const scrollMetrics = await scrollViewport.evaluate((element) => ({
		clientHeight: element.clientHeight,
		scrollHeight: element.scrollHeight,
	}));
	expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
	await scrollViewport.evaluate((element) => {
		element.scrollTop = element.scrollHeight;
	});
	await expect
		.poll(() => scrollViewport.evaluate((element) => element.scrollTop))
		.toBeGreaterThan(0);
	const headerAfterScroll = await drawerHeader.boundingBox();
	const filterAfterScroll = await filter.boundingBox();
	expect(headerAfterScroll?.y).toBe(headerBeforeScroll?.y);
	expect(filterAfterScroll?.y).toBe(filterBeforeScroll?.y);

	const closeButton = drawer.getByRole("button", { name: "Close inventory activity", exact: true });
	const closeButtonBox = await closeButton.boundingBox();
	expect(closeButtonBox?.width).toBeGreaterThanOrEqual(44);
	expect(closeButtonBox?.height).toBeGreaterThanOrEqual(44);

	const timeTrigger = drawer.locator("time").first();
	const timeLabel = await timeTrigger.getAttribute("aria-label");
	const fullTimestamp = timeLabel?.replace("Recorded ", "");
	await expect(timeTrigger).toHaveAttribute("tabindex", "0");
	await timeTrigger.focus();
	await page.keyboard.press("Tab");
	await page.keyboard.press("Shift+Tab");
	await expect(timeTrigger).toBeFocused();
	const timestampTooltip = page.getByRole("tooltip", { name: fullTimestamp, exact: true });
	await expect(timestampTooltip).toBeVisible();
	await expect(timestampTooltip).toHaveText(fullTimestamp ?? "");

	await drawer.getByRole("button", { name: "Load more activity", exact: true }).click();
	await expect(drawer.getByText("Added Ledger Item 19", { exact: true })).toBeVisible();
	await expect(drawer.getByText("Added Ledger Item 20", { exact: true })).toBeVisible();
	await expect(
		drawer.getByText("This activity entry cannot be displayed.", { exact: true }),
	).toBeVisible();

	const itemRequest = page.waitForRequest((request) => {
		const url = new URL(request.url());
		return (
			url.pathname.endsWith("/history") &&
			url.searchParams.get("entityType") === "item" &&
			url.searchParams.get("offset") === "0"
		);
	});
	await drawer.getByText("Items", { exact: true }).click();
	await itemRequest;
	await expect(drawer.getByRole("radio", { name: "Items", exact: true })).toBeChecked();
	await expect(drawer.getByText("Added 1 GP", { exact: true })).toHaveCount(0);
	await expect(drawer.getByText("Added Ledger Item 00", { exact: true })).toHaveCount(0);
	await expect(drawer.getByText("Added Ledger Item 50", { exact: true })).toBeVisible();

	await closeButton.click();
	await expect(preview).toBeFocused();
	await preview.click();
	await expect(drawer).toBeVisible();
	await expect(drawer.getByRole("radio", { name: "Items", exact: true })).toBeChecked();
	await expect(drawer.getByText("Added Ledger Item 50", { exact: true })).toBeVisible();

	const treasuryRequest = page.waitForRequest((request) => {
		const url = new URL(request.url());
		return (
			url.pathname.endsWith("/history") &&
			url.searchParams.get("entityType") === "currency" &&
			url.searchParams.get("offset") === "0"
		);
	});
	await drawer.getByText("Treasury", { exact: true }).click();
	await treasuryRequest;
	await expect(drawer.getByText("Added 1 GP", { exact: true })).toBeVisible();
	await expect(drawer.getByText("Added Ledger Item 50", { exact: true })).toHaveCount(0);

	await drawer.getByText("All", { exact: true }).click();
	await expect(drawer.getByRole("radio", { name: "All", exact: true })).toBeChecked();
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
	await expect.poll(() => refreshedFirstPageResolved).toBe(true);
	await expect(drawer.getByText("Added Mutation trigger", { exact: true })).toHaveCount(0);
	await expect(drawer.getByText("Added Ledger Item 18", { exact: true })).toHaveCount(1);
	releaseRefreshedPage();
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

	await page.setViewportSize({ width: 600, height: 844 });
	const intermediateDrawer = await drawer.boundingBox();
	const intermediateViewport = page.viewportSize();
	expect(intermediateDrawer).not.toBeNull();
	expect(intermediateViewport).not.toBeNull();
	if (intermediateDrawer && intermediateViewport) {
		expect(intermediateDrawer.width).toBe(intermediateViewport.width);
	}

	await page.setViewportSize({ width: 390, height: 844 });
	const mobileDrawer = await drawer.boundingBox();
	const viewport = page.viewportSize();
	expect(mobileDrawer).not.toBeNull();
	expect(viewport).not.toBeNull();
	if (mobileDrawer && viewport) expect(mobileDrawer.width).toBe(viewport.width);
	await expect(drawer.locator(".character-activity-entry").first()).toHaveCSS(
		"grid-template-columns",
		/^28px /,
	);
	await expect(drawer.locator("time").first()).toHaveCSS("display", "block");
});

test("retains the ledger and retries a failed loaded page refresh", async ({ page }) => {
	let historyRefreshed = false;
	let failFirstPageRefresh = true;
	let failedPageRequest: string | null = null;
	const historyRequests: string[] = [];

	await page.route("**/api/characters/*/history**", async (route) => {
		const requestUrl = new URL(route.request().url());
		const offset = Number(requestUrl.searchParams.get("offset") ?? 0);
		const limit = Number(requestUrl.searchParams.get("limit") ?? 20);
		historyRequests.push(requestUrl.href);

		if (limit === 1) {
			return fulfillHistory(
				route,
				[historyRefreshed ? mutationEntry("Refresh error trigger") : itemEntry(0)],
				1,
				limit,
				0,
				false,
			);
		}
		if (historyRefreshed && offset === 0 && failFirstPageRefresh) {
			failFirstPageRefresh = false;
			failedPageRequest = requestUrl.href;
			return route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Activity refresh unavailable" }),
			});
		}
		if (!historyRefreshed) {
			return fulfillHistory(
				route,
				offset === 0 ? itemEntries(20) : [itemEntry(20)],
				21,
				limit,
				offset,
				offset === 0,
			);
		}
		return fulfillHistory(
			route,
			offset === 0
				? [mutationEntry("Refresh error trigger"), ...itemEntries(19)]
				: itemEntries(3, 19),
			23,
			limit,
			offset,
			true,
		);
	});
	await page.route("**/api/characters/*/items", async (route) => {
		if (route.request().method() !== "POST") return route.continue();
		const response = await route.fetch();
		historyRefreshed = true;
		return route.fulfill({ response });
	});

	await page.goto("/");
	await createCharacter(page, `Activity Refresh Error ${Date.now()}`, "Fighter");
	await openInventoryTab(page);
	const preview = page.getByRole("button", { name: "View inventory activity" });
	await preview.click();
	const drawer = page.getByRole("dialog", { name: "Inventory activity" });
	await drawer.getByRole("button", { name: "Load more activity", exact: true }).click();
	await expect(drawer.getByText("Added Ledger Item 20", { exact: true })).toBeVisible();
	await drawer.getByRole("button", { name: "Close inventory activity", exact: true }).click();

	const inventory = page.getByTestId("personal-inventory");
	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const addDialog = page.getByRole("dialog", { name: "Add personal item" });
	await addDialog.getByLabel("Name").fill("Refresh error trigger");
	await addDialog.getByLabel("Category").fill("Testing");
	await addDialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(addDialog).toBeHidden();

	await expect(preview.getByText("Added Refresh error trigger", { exact: true })).toBeVisible();
	await preview.click();
	await expect.poll(() => failedPageRequest).not.toBeNull();
	const failedUrl = new URL(failedPageRequest ?? "http://127.0.0.1/");
	expect(failedUrl.pathname.endsWith("/history")).toBe(true);
	expect(failedUrl.searchParams.get("offset")).toBe("0");
	expect(failedUrl.searchParams.get("limit")).toBe("20");
	await expect(drawer.getByText("Added Ledger Item 00", { exact: true })).toBeVisible();
	await expect(drawer.getByText("Added Ledger Item 20", { exact: true })).toBeVisible();
	await expect(drawer.getByText("Activity update incomplete", { exact: true })).toBeVisible();
	await expect(drawer.getByRole("button", { name: "Retry activity", exact: true })).toBeVisible();
	await expect(drawer.getByRole("button", { name: "Load more activity", exact: true })).toHaveCount(
		0,
	);

	await drawer.getByRole("button", { name: "Retry activity", exact: true }).click();
	await expect
		.poll(
			() =>
				historyRequests.filter((request) => {
					const url = new URL(request);
					return url.searchParams.get("limit") === "20" && url.searchParams.get("offset") === "0";
				}).length,
		)
		.toBe(3);
	await expect(drawer.getByText("Added Refresh error trigger", { exact: true })).toBeVisible();
	for (let index = 0; index <= 21; index += 1) {
		await expect(
			drawer.getByText(`Added Ledger Item ${String(index).padStart(2, "0")}`, { exact: true }),
		).toHaveCount(1);
	}
	await expect(drawer.getByText("Activity update incomplete", { exact: true })).toHaveCount(0);
	await expect(
		drawer.getByRole("button", { name: "Load more activity", exact: true }),
	).toBeVisible();
});

test("shows an activity retry when a previously empty history refetch fails", async ({ page }) => {
	let historyRefreshed = false;
	let failFirstPageRefresh = true;
	let failedPageRequest: string | null = null;
	const historyRequests: string[] = [];

	await page.route("**/api/characters/*/history**", async (route) => {
		const requestUrl = new URL(route.request().url());
		const offset = Number(requestUrl.searchParams.get("offset") ?? 0);
		const limit = Number(requestUrl.searchParams.get("limit") ?? 20);
		historyRequests.push(requestUrl.href);

		if (limit === 1) {
			return fulfillHistory(
				route,
				historyRefreshed ? [mutationEntry("Empty refresh recovery")] : [],
				historyRefreshed ? 1 : 0,
				limit,
				0,
				false,
			);
		}
		if (offset === 0 && historyRefreshed && failFirstPageRefresh) {
			failFirstPageRefresh = false;
			failedPageRequest = requestUrl.href;
			return route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Activity refresh unavailable" }),
			});
		}
		return fulfillHistory(
			route,
			historyRefreshed ? [mutationEntry("Empty refresh recovery")] : [],
			historyRefreshed ? 1 : 0,
			limit,
			offset,
			false,
		);
	});
	await page.route("**/api/characters/*/items", async (route) => {
		if (route.request().method() !== "POST") return route.continue();
		const response = await route.fetch();
		historyRefreshed = true;
		return route.fulfill({ response });
	});

	await page.goto("/");
	await createCharacter(page, `Activity Empty Refresh ${Date.now()}`, "Fighter");
	await openInventoryTab(page);
	const preview = page.getByRole("button", { name: "View inventory activity" });
	await preview.click();
	const drawer = page.getByRole("dialog", { name: "Inventory activity" });
	await expect(drawer.getByText("No activity yet", { exact: true })).toBeVisible();
	await drawer.getByRole("button", { name: "Close inventory activity", exact: true }).click();

	const inventory = page.getByTestId("personal-inventory");
	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const addDialog = page.getByRole("dialog", { name: "Add personal item" });
	await addDialog.getByLabel("Name").fill("Empty refresh recovery");
	await addDialog.getByLabel("Category").fill("Testing");
	await addDialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(addDialog).toBeHidden();
	await expect(preview.getByText("Added Empty refresh recovery", { exact: true })).toBeVisible();

	await preview.click();
	await expect.poll(() => failedPageRequest).not.toBeNull();
	const failedUrl = new URL(failedPageRequest ?? "http://127.0.0.1/");
	expect(failedUrl.pathname.endsWith("/history")).toBe(true);
	expect(failedUrl.searchParams.get("offset")).toBe("0");
	expect(failedUrl.searchParams.get("limit")).toBe("20");
	await expect(drawer.getByText("Activity unavailable", { exact: true })).toBeVisible();
	await expect(drawer.getByRole("button", { name: "Retry activity", exact: true })).toBeVisible();
	await expect(drawer.getByText("No activity yet", { exact: true })).toHaveCount(0);

	await drawer.getByRole("button", { name: "Retry activity", exact: true }).click();
	await expect
		.poll(
			() =>
				historyRequests.filter((request) => {
					const url = new URL(request);
					return url.searchParams.get("limit") === "20" && url.searchParams.get("offset") === "0";
				}).length,
		)
		.toBe(3);
	await expect(drawer.getByText("Added Empty refresh recovery", { exact: true })).toBeVisible();
	await expect(drawer.getByText("Activity unavailable", { exact: true })).toHaveCount(0);
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

test("keeps full drawer details readable while clamping long notes", async ({ page }) => {
	await page.route("**/api/characters/*/history**", async (route) => {
		const requestUrl = new URL(route.request().url());
		const limit = Number(requestUrl.searchParams.get("limit") ?? 20);
		return fulfillHistory(route, [longUpdatedEntry()], 1, limit, 0, false);
	});

	await page.goto("/");
	await createCharacter(page, `Activity Detail ${Date.now()}`, "Fighter");
	await openInventoryTab(page);
	await page.getByRole("button", { name: "View inventory activity" }).click();

	const drawer = page.getByRole("dialog", { name: "Inventory activity" });
	await expect(drawer).toBeVisible();
	const detail = drawer.locator(".character-activity-drawer-detail");
	const note = drawer.locator(".character-activity-drawer-note");
	await expect(detail).toBeVisible();
	await expect(note).toBeVisible();

	const noteMetrics = await note.evaluate((element) => {
		const style = window.getComputedStyle(element);
		return {
			clientHeight: element.clientHeight,
			display: style.display,
			lineClamp: style.webkitLineClamp,
			overflow: style.overflow,
			scrollHeight: element.scrollHeight,
		};
	});
	const detailMetrics = await detail.evaluate((element) => {
		const style = window.getComputedStyle(element);
		return {
			clientHeight: element.clientHeight,
			display: style.display,
			lineClamp: style.webkitLineClamp,
			scrollHeight: element.scrollHeight,
		};
	});

	expect(noteMetrics.lineClamp).toBe("2");
	expect(noteMetrics.overflow).toBe("hidden");
	expect(noteMetrics.scrollHeight).toBeGreaterThan(noteMetrics.clientHeight);
	expect(detailMetrics.display).not.toBe("-webkit-box");
	expect(detailMetrics.lineClamp).not.toBe("2");
	expect(detailMetrics.scrollHeight).toBe(detailMetrics.clientHeight);
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

function mutationEntry(name = "Mutation trigger") {
	const entry = itemEntry(99);
	return {
		...entry,
		id: `${historyIdPrefix}000000000099`,
		entityId: `${historyIdPrefix}000000000299`,
		entityName: name,
		details: {
			...entry.details,
			item: {
				...entry.details.item,
				id: `${historyIdPrefix}000000000299`,
				name,
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

function longUpdatedEntry() {
	const itemId = `${historyIdPrefix}000000000401`;
	const beforeName = `Before ${"etched travel journal ".repeat(4)}`.trim();
	const afterName = `After ${"etched travel journal ".repeat(4)}`.trim();
	const beforeCategory = `Before ${"field notes and maps ".repeat(4)}`.trim();
	const afterCategory = `After ${"field notes and maps ".repeat(4)}`.trim();
	const before = {
		id: itemId,
		name: beforeName,
		type: "misc",
		category: beforeCategory,
		rarity: null,
		quantity: 1,
		weight: null,
		estimatedValue: null,
		isEquipped: false,
		notes: "An old note.",
	};
	const after = {
		...before,
		name: afterName,
		category: afterCategory,
		notes: `A detailed expedition note ${"about the route, weather, and camp supplies ".repeat(8)}`,
	};
	return {
		id: `${historyIdPrefix}000000000402`,
		entityId: itemId,
		entityName: afterName,
		entityType: "item",
		action: "item_updated",
		actorUserId: null,
		createdAt: "2026-09-03T12:00:00.000Z",
		details: {
			version: 1,
			before,
			after,
			changedFields: ["name", "category", "notes"],
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
