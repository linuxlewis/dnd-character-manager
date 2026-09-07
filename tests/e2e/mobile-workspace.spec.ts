import { expect, test } from "@playwright/test";
import postgres from "postgres";
import {
	cleanupCatalogueJourneyFixture,
	prepareCatalogueJourneyFixture,
} from "./catalogue-journey-fixture.js";
import { openInventoryTab, openSpellsAndAbilitiesTab } from "./character-detail-helpers.js";
import {
	assertNoOverflow,
	assertReachable,
	assertTouchTarget,
	captureMobileEvidence,
} from "./mobile-workspace-evidence.js";
import { prepareMobileWorkspace } from "./mobile-workspace-fixture.js";

test.use({ locale: "en-US", timezoneId: "UTC", contextOptions: { reducedMotion: "reduce" } });

const database = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
test.beforeAll(async () => {
	test.setTimeout(120_000);
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required from owned test stack");
	await prepareCatalogueJourneyFixture(database);
});
test.afterAll(async () => {
	try {
		await cleanupCatalogueJourneyFixture(database);
	} finally {
		await database.end();
	}
});

const viewports = [
	{ width: 320, height: 740 },
	{ width: 390, height: 844 },
	{ width: 430, height: 932 },
	{ width: 767, height: 900 },
	{ width: 768, height: 900 },
	{ width: 991, height: 900 },
	{ width: 992, height: 900 },
	{ width: 1280, height: 900 },
	{ width: 844, height: 390 },
];

test("mobile workspace visual geometry and responsive boundaries", async ({ page }, info) => {
	test.setTimeout(180_000);
	const fixture = await prepareMobileWorkspace(page);
	for (const viewport of viewports) {
		await page.setViewportSize(viewport);
		for (const section of ["spells", "inventory"]) {
			await page.goto(`${fixture.path}/${section}`);
			const nav = page.getByRole("navigation", { name: "Character sections" });
			await expect(nav.getByRole("link")).toHaveCount(2);
			await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
			await expect(page.locator("footer")).toHaveCount(0);
			await expect(page.getByText("72% to Lv 4", { exact: true })).toBeVisible();
			if (section === "inventory")
				await expect(
					page.getByRole("button", { name: "View Quarterstaff", exact: true }),
				).toBeVisible();
			else
				await expect(
					page.getByRole("button", { name: "View Light details", exact: true }),
				).toBeVisible();
			await assertNoOverflow(page);
			if (viewport.width < 768) {
				const header = await page
					.getByRole("region", { name: "Character workspace header" })
					.boundingBox();
				expect(header?.height).toBeLessThanOrEqual(144);
				const navBox = await assertReachable(nav, page);
				expect(navBox.height).toBeGreaterThanOrEqual(56);
				expect(navBox.height).toBeLessThanOrEqual(64);
				expect(navBox.y + navBox.height).toBe(viewport.height);
				for (const link of await nav.getByRole("link").all()) await assertTouchTarget(link, page);
				for (const name of ["Heal", "Damage"])
					await assertTouchTarget(page.getByRole("button", { name, exact: true }), page);
			} else expect(await nav.evaluate((e) => getComputedStyle(e).position)).not.toBe("fixed");
			if (section === "inventory") {
				expect(
					(await page.getByTestId("treasury-summary").boundingBox())?.height,
				).toBeLessThanOrEqual(104);
				if (viewport.height < 480)
					await page.getByLabel("Search personal inventory").scrollIntoViewIfNeeded();
				await assertReachable(page.getByLabel("Search personal inventory"), page);
				if (viewport.height < 480)
					await page
						.getByRole("button", { name: "Add item", exact: true })
						.scrollIntoViewIfNeeded();
				await assertTouchTarget(page.getByRole("button", { name: "Add item", exact: true }), page);
				if (viewport.width === 390)
					await assertReachable(page.getByTestId(/inventory-item-/).first(), page);
			} else if (viewport.width === 320 || viewport.width === 390) {
				await assertReachable(
					page.getByRole("button", { name: "View Light details", exact: true }),
					page,
				);
				if (viewport.width === 390) {
					await assertTouchTarget(
						page.getByRole("button", { name: "Use 1st-level", exact: true }),
						page,
					);
					await assertTouchTarget(
						page.getByRole("button", { name: "Restore 1st-level", exact: true }),
						page,
					);
				}
			}
			await captureMobileEvidence(page, info, `${section}-top`, [
				"V3",
				"V4",
				"V5",
				"N1",
				"H2",
				section === "spells" ? "S1" : "I1",
			]);
			await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
			if (viewport.width < 768) {
				const headerY =
					(await page.getByRole("region", { name: "Character workspace header" }).boundingBox())
						?.y ?? -1;
				if (await page.evaluate(() => scrollY > 0)) expect(headerY).toBe(0);
				else expect(headerY).toBeLessThanOrEqual(16);
				await assertReachable(nav, page);
			}
			if (section === "inventory")
				await assertReachable(page.getByTestId(/inventory-item-/).last(), page);
			await assertNoOverflow(page);
			await captureMobileEvidence(page, info, `${section}-bottom`, ["V6", "N6"]);
		}
	}
});

test("mobile workspace preserves section state and isolates inactive queries", async ({
	page,
}, info) => {
	test.setTimeout(90_000);
	await page.setViewportSize({ width: 390, height: 844 });
	const fixture = await prepareMobileWorkspace(page);
	const requests: string[] = [];
	page.on("request", (r) => {
		if (r.method() === "GET" && r.url().includes(`/api/characters/${fixture.id}/`))
			requests.push(r.url());
	});
	await page.goto(`${fixture.path}/spells`);
	await expect(page.getByRole("button", { name: "View Light details" })).toBeVisible();
	expect(requests.filter((url) => /\/(items|treasury|history)(\?|$)/.test(url))).toEqual([]);
	await openInventoryTab(page);
	await page.getByLabel("Search personal inventory").fill("Travel");
	await page.getByRole("button", { name: /^Potion/ }).click();
	await expect(page.getByRole("button", { name: "View Travel supply 09" })).toBeVisible();
	await expect(page.getByTestId(/inventory-item-/)).toHaveCount(5);
	await page.evaluate(() => scrollTo(0, 500));
	const scroll = await page.evaluate(() => scrollY);
	await openSpellsAndAbilitiesTab(page);
	await expect(page.getByRole("button", { name: "View Light details" })).toBeVisible();
	await page.goBack();
	await expect(page.getByLabel("Search personal inventory")).toHaveValue("Travel");
	await expect(page.getByRole("button", { name: /^Potion/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
	await captureMobileEvidence(page, info, "inventory-restored", ["N2", "N3", "N4"]);
	await page.reload();
	await expect(page.getByRole("link", { name: "Inventory", exact: true })).toHaveAttribute(
		"aria-current",
		"page",
	);
	await page.goto(`${fixture.path}/spells`);
	await expect(page.getByRole("link", { name: "Spells & Abilities", exact: true })).toHaveAttribute(
		"aria-current",
		"page",
	);
});

test("mobile workspace item editor retains failed draft and traps focus above chrome", async ({
	page,
}, info) => {
	test.setTimeout(90_000);
	await page.setViewportSize({ width: 320, height: 740 });
	const fixture = await prepareMobileWorkspace(page);
	await page.goto(`${fixture.path}/inventory`);
	const trigger = page.getByRole("button", { name: "Add item", exact: true });
	await trigger.click();
	const dialog = page.getByRole("dialog", { name: "Add personal item" });
	await expect(dialog).toBeVisible();
	const save = dialog.getByRole("button", { name: "Add item", exact: true });
	const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
	await assertTouchTarget(save, page);
	await assertTouchTarget(cancel, page);
	await dialog.getByLabel("Name").fill("A retained mobile draft");
	await expect(dialog.getByLabel("Name")).toHaveCSS("font-size", "16px");
	await captureMobileEvidence(page, info, "item-editor-top", ["E1", "E4"]);
	await dialog.getByLabel("Notes").fill("Last field is reachable above actions");
	await dialog.getByLabel("Thumbnail URL").scrollIntoViewIfNeeded();
	await assertReachable(dialog.getByLabel("Thumbnail URL"), page);
	await assertTouchTarget(save, page);
	for (let step = 0; step < 16; step++) {
		await page.keyboard.press("Tab");
		expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(true);
	}
	const nav = page.getByRole("navigation", { name: "Character sections", includeHidden: true });
	expect(
		await nav.evaluate((element) => {
			const box = element.getBoundingClientRect();
			const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
			return element.contains(hit);
		}),
	).toBe(false);
	await captureMobileEvidence(page, info, "item-editor-bottom", ["E1", "E5"]);
	await page.route(`**/api/characters/${fixture.id}/items`, async (route) => {
		if (route.request().method() === "POST")
			await route.fulfill({ status: 503, json: { error: "Item save temporarily unavailable" } });
		else await route.continue();
	});
	await save.click();
	await expect(dialog.getByRole("alert", { name: "Item could not be saved" })).toBeVisible();
	await dialog.getByRole("alert", { name: "Item could not be saved" }).scrollIntoViewIfNeeded();
	await assertReachable(dialog.getByRole("alert", { name: "Item could not be saved" }), page);
	await expect(dialog.getByLabel("Name")).toHaveValue("A retained mobile draft");
	await assertReachable(save, page);
	await captureMobileEvidence(page, info, "item-editor-error", ["E3", "E6"]);
	await cancel.click();
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
	await page.unroute(`**/api/characters/${fixture.id}/items`);
});

test("mobile workspace geometry rejects injected overlap", async ({ page }) => {
	test.setTimeout(60_000);
	const fixture = await prepareMobileWorkspace(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(`${fixture.path}/spells`);
	const target = page.getByRole("button", { name: "Damage", exact: true });
	await assertReachable(target, page);
	await page.evaluate(() => {
		const overlay = document.createElement("div");
		overlay.id = "test-only-occlusion";
		overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:white";
		document.body.append(overlay);
	});
	await expect(assertReachable(target, page)).rejects.toThrow();
	await page.locator("#test-only-occlusion").evaluate((element) => element.remove());
	await assertReachable(target, page);
});

test("mobile workspace XP boundaries and enlarged text remain readable", async ({ page }, info) => {
	test.setTimeout(90_000);
	await page.setViewportSize({ width: 390, height: 844 });
	const fixture = await prepareMobileWorkspace(page);
	for (const state of [
		{ xp: 0, level: 1, label: "0% to Lv 2" },
		{ xp: 0, level: 5, label: "0% to Lv 6" },
		{ xp: 0, level: 3, label: "0% to Lv 4" },
		{ xp: 900, level: 3, label: "0% to Lv 4" },
		{ xp: 2699, level: 3, label: "99% to Lv 4" },
		{ xp: 2700, level: 3, label: "Level 4 available" },
		{ xp: 6500, level: 3, label: "Level 4 available" },
		{ xp: 355000, level: 20, label: "Max level" },
	]) {
		expect(
			(
				await page.request.put(`/api/characters/${fixture.id}/level`, {
					data: { level: state.level },
				})
			).ok(),
		).toBeTruthy();
		expect(
			(
				await page.request.put(`/api/characters/${fixture.id}/experience`, {
					data: { experiencePoints: state.xp },
				})
			).ok(),
		).toBeTruthy();
		await page.goto(`${fixture.path}/spells`);
		await expect(page.getByText(state.label, { exact: true })).toBeVisible();
		const progress = page.getByRole("progressbar", { name: "Experience progress", exact: true });
		await expect(progress).toHaveCount(1);
		await expect(progress).toHaveAttribute(
			"aria-valuetext",
			`${new Intl.NumberFormat("en-US").format(state.xp)} XP. ${state.label}`,
		);
		await assertNoOverflow(page);
		await captureMobileEvidence(page, info, `xp-${state.xp}-level-${state.level}`, [
			"H3",
			"H4",
			"H5",
		]);
	}
	const longName = "Mira Thorn of the Ancient Observatory ".repeat(4).slice(0, 120);
	expect(
		(
			await page.request.put(`/api/characters/${fixture.id}/name`, { data: { name: longName } })
		).ok(),
	).toBeTruthy();
	await page.goto(`${fixture.path}/inventory`);
	await expect(page.getByLabel("Search personal inventory")).toBeVisible();
	await captureMobileEvidence(page, info, "long-name", ["H3"]);
	// Text-only enlargement, not viewport scaling: geometry budgets are intentionally waived.
	await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
	await assertNoOverflow(page);
	await page.getByRole("button", { name: "Add item", exact: true }).scrollIntoViewIfNeeded();
	await page.getByRole("button", { name: "Add item", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add personal item" });
	await expect(dialog).toBeVisible();
	await dialog.getByLabel("Notes").fill("Enlarged text last field");
	await dialog.getByLabel("Thumbnail URL").scrollIntoViewIfNeeded();
	await assertReachable(dialog.getByLabel("Thumbnail URL"), page);
	await assertReachable(dialog.getByRole("button", { name: "Cancel", exact: true }), page);
	await captureMobileEvidence(page, info, "item-editor-text-200", ["V6", "E1", "E4"]);
});

test("mobile workspace local failures retain escape and working section", async ({
	page,
}, info) => {
	test.setTimeout(90_000);
	await page.setViewportSize({ width: 390, height: 844 });
	const fixture = await prepareMobileWorkspace(page);
	await page.route(`**/api/characters/${fixture.id}/treasury`, (route) =>
		route.fulfill({ status: 503, json: { error: "Treasury unavailable" } }),
	);
	await page.goto(`${fixture.path}/inventory`);
	await expect(page.getByRole("button", { name: "View Quarterstaff", exact: true })).toBeVisible();
	await expect(page.getByRole("alert")).toBeVisible();
	await captureMobileEvidence(page, info, "treasury-error-items-working", ["I3", "H6"]);
	await openSpellsAndAbilitiesTab(page);
	await expect(page.getByRole("button", { name: "View Light details" })).toBeVisible();
	await page.unroute(`**/api/characters/${fixture.id}/treasury`);
	await page.goto("/characters/00000000-0000-4000-8000-000000000000/inventory");
	await expect(page.getByText("Character not found", { exact: true })).toBeVisible();
	await expect(page.getByRole("navigation", { name: "Character sections" })).toHaveCount(0);
	await assertReachable(page.getByRole("link", { name: "Back to characters", exact: true }), page);
	await captureMobileEvidence(page, info, "not-found", ["H7", "N2"]);
});

test("mobile workspace supported numeric extremes do not overflow", async ({ page }, info) => {
	test.setTimeout(90_000);
	const fixture = await prepareMobileWorkspace(page);
	const root = `/api/characters/${fixture.id}`;
	for (const width of [320, 390]) {
		await page.setViewportSize({ width, height: 844 });
		for (const health of [
			{ currentHp: 0, maxHp: 24, temporaryHp: 0 },
			{ currentHp: 9999, maxHp: 9999, temporaryHp: 0 },
			{ currentHp: 9999, maxHp: 1, temporaryHp: 9998 },
		]) {
			const first = await page.request.put(`${root}/health`, { data: health });
			expect(first.ok()).toBeTruthy();
			const saved = await page.request.put(`${root}/health`, { data: health });
			expect(saved.ok()).toBeTruthy();
			const result = await saved.json();
			await page.goto(`${fixture.path}/spells`);
			await expect(page.getByRole("button", { name: "Damage", exact: true })).toBeVisible();
			await assertNoOverflow(page);
			await assertTouchTarget(page.getByRole("button", { name: "Damage", exact: true }), page);
			await captureMobileEvidence(
				page,
				info,
				`health-${result.health.currentHp}-${result.health.temporaryHp}`,
				["H2", "H6", "V6"],
			);
		}
	}
	const added = await page.request.put(`${root}/treasury`, {
		data: {
			delta: { pp: 2000000, gp: 2000000, sp: 2000000, cp: 2000000 },
			expectedPrevious: { pp: 1, gp: 12, sp: 4, cp: 8 },
		},
	});
	expect(added.ok()).toBeTruthy();
	await page.goto(`${fixture.path}/inventory`);
	await expect(page.getByTestId("treasury-summary")).toBeVisible();
	await assertNoOverflow(page);
	await captureMobileEvidence(page, info, "currency-large", ["I1", "V6"]);
});

test("mobile workspace menu dialogs return focus to a stable trigger", async ({ page }, info) => {
	test.setTimeout(90_000);
	await page.setViewportSize({ width: 390, height: 844 });
	const fixture = await prepareMobileWorkspace(page);
	await page.goto(`${fixture.path}/spells`);
	const menu = page.getByRole("button", { name: "Open application menu", exact: true });
	for (const name of ["Edit character", "Health history"]) {
		await menu.click();
		await page.getByRole("menuitem", { name, exact: true }).click();
		const dialog = page.getByRole("dialog", { name, exact: true });
		await expect(dialog).toBeVisible();
		await captureMobileEvidence(page, info, `menu-${name.toLowerCase().replaceAll(" ", "-")}`, [
			"E5",
			"N5",
		]);
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						document.activeElement?.getAttribute("aria-label") ??
						`MISSING:${document.activeElement?.tagName}`,
				),
			)
			.toMatch(/Open application menu|Character details for/);
	}
});
