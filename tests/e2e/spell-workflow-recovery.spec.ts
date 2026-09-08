import { expect, type Page, test } from "@playwright/test";

const savedSpell = {
	id: "00000000-0000-4000-8000-000000000031",
	slotLevel: 0,
	spellIndex: "light",
	name: "Light",
	level: 0,
	url: "/api/2014/spells/light",
	source: "spell",
};
const result = { index: "light", name: "Light", level: 0, url: savedSpell.url, source: "spell" };

test("search and save fail locally, retry explicitly, and guard pending dismissal", async ({
	page,
}) => {
	const id = await createCharacter(page);
	let searches = 0;
	let saves = 0;
	const release = barrier();
	await page.route(`**/api/characters/${id}/spells/search`, async (route) => {
		searches++;
		await route.fulfill({
			status: searches === 1 ? 502 : 200,
			json: searches === 1 ? { error: "Search unavailable" } : { spells: [result] },
		});
	});
	await page.route(`**/api/characters/${id}/spells`, async (route) => {
		if (route.request().method() !== "POST") return route.fulfill({ json: { spells: [] } });
		saves++;
		expect(route.request().postDataJSON()).toEqual({
			slotLevel: 0,
			spellIndex: "light",
			source: "spell",
		});
		if (saves === 1) return route.fulfill({ status: 502, json: { error: "Save unavailable" } });
		await release.promise;
		await route.fulfill({ json: { spells: [savedSpell] } });
	});
	await page.goto(`/characters/${id}`);
	await page.waitForLoadState("networkidle");
	const reads: string[] = [];
	page.on("request", (request) => {
		if (request.method() === "GET" && new URL(request.url()).pathname.startsWith("/api/characters"))
			reads.push(request.url());
	});
	await page.getByRole("button", { name: "Add cantrip or feature", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add cantrip or feature", exact: true });
	await dialog.getByLabel("Search cantrips and features").fill("light");
	await expect(dialog.getByText("Spell search unavailable")).toBeVisible();
	expect(searches).toBe(1);
	await dialog.getByRole("button", { name: "Retry search" }).click();
	await dialog.getByRole("button", { name: /Light/ }).click();
	await expect(dialog.getByText("Spell could not be saved")).toBeVisible();
	await expect(dialog.getByLabel("Search cantrips and features")).toHaveValue("light");
	await expect(page.getByRole("button", { name: "View Light details" })).toHaveCount(0);
	expect(saves).toBe(1);
	try {
		await dialog.getByRole("button", { name: "Retry saving spell" }).click();
		await expect.poll(() => saves).toBe(2);
		await expect(dialog.getByRole("button", { name: "Close add spell dialog" })).toBeDisabled();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeVisible();
	} finally {
		release.resolve();
	}
	await expect(dialog).toBeHidden();
	await expect(page.getByRole("button", { name: "View Light details" })).toBeVisible();
	await page.getByRole("button", { name: "Add cantrip or feature", exact: true }).click();
	await expect(dialog.getByLabel("Search cantrips and features")).toHaveValue("");
	await expect(dialog.getByText("Spell could not be saved")).toHaveCount(0);
	await expect(dialog.getByText("Spell search unavailable")).toHaveCount(0);
	expect(searches).toBe(2);
	expect(saves).toBe(2);
	await page.waitForLoadState("networkidle");
	expect(reads).toEqual([]);
});

test("details retry and remove cancellation, failure and pending confirmation stay in their dialogs", async ({
	page,
}) => {
	const id = await createCharacter(page);
	const other = { ...savedSpell, id: "00000000-0000-4000-8000-000000000032", name: "Other light" };
	let details = 0;
	let deletes = 0;
	const release = barrier();
	await page.route(`**/api/characters/${id}/spells`, (route) =>
		route.fulfill({ json: { spells: [savedSpell, other] } }),
	);
	await page.route(`**/api/characters/${id}/spells/${savedSpell.id}`, async (route) => {
		if (route.request().method() === "DELETE") {
			deletes++;
			if (deletes === 1)
				return route.fulfill({ status: 502, json: { error: "Remove unavailable" } });
			await release.promise;
			return route.fulfill({ json: { spells: [other] } });
		}
		details++;
		return route.fulfill({
			status: details === 1 ? 502 : 200,
			json:
				details === 1
					? { error: "Details unavailable" }
					: {
							spell: {
								...savedSpell,
								desc: ["A bright magical light."],
								higherLevel: [],
								metadata: [],
							},
						},
		});
	});
	await page.goto(`/characters/${id}`);
	await page.waitForLoadState("networkidle");
	const reads: string[] = [];
	page.on("request", (request) => {
		const path = new URL(request.url()).pathname;
		if (
			request.method() === "GET" &&
			path.startsWith("/api/characters") &&
			path !== `/api/characters/${id}/spells/${savedSpell.id}`
		)
			reads.push(path);
	});
	await page.getByRole("button", { name: "View Light details", exact: true }).click();
	await expect(page.getByRole("dialog").getByText("Spell details unavailable")).toBeVisible();
	expect(details).toBe(1);
	await page.getByRole("button", { name: "Retry details" }).click();
	await expect(page.getByRole("dialog").getByText("A bright magical light.")).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toBeHidden();
	await page.getByRole("button", { name: "Edit spells", exact: true }).click();
	await page.getByRole("button", { name: "Remove Light", exact: true }).click();
	const confirmation = page.getByRole("dialog", { name: "Remove Light?", exact: true });
	await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
	expect(deletes).toBe(0);
	await page.getByRole("button", { name: "Remove Light", exact: true }).click();
	await confirmation.getByRole("button", { name: "Remove spell", exact: true }).click();
	await expect(confirmation.getByText("Spell could not be removed")).toBeVisible();
	await expect(page.getByRole("button", { name: "View Light details", exact: true })).toBeVisible();
	expect(deletes).toBe(1);
	try {
		await confirmation.getByRole("button", { name: "Remove spell", exact: true }).click();
		await expect.poll(() => deletes).toBe(2);
		await expect(confirmation.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
		await page.keyboard.press("Escape");
		await expect(confirmation).toBeVisible();
	} finally {
		release.resolve();
	}
	await expect(confirmation).toBeHidden();
	await expect(page.getByRole("button", { name: "View Light details", exact: true })).toHaveCount(
		0,
	);
	await expect(
		page.getByRole("button", { name: "View Other light details", exact: true }),
	).toBeVisible();
	await expect(page.getByText("Spells unavailable", { exact: true })).toHaveCount(0);
	expect(details).toBe(2);
	expect(deletes).toBe(2);
	await page.waitForLoadState("networkidle");
	expect(reads).toEqual([]);
});

test("late search results cannot replace newer matches or a newly opened slot bucket", async ({
	page,
}) => {
	const id = await createCharacter(page);
	let oldStarted = false;
	const release = barrier();
	const completed = barrier();
	await page.route(`**/api/characters/${id}/spells/search`, async (route) => {
		const body = route.request().postDataJSON();
		if (body.query === "old") {
			oldStarted = true;
			await release.promise;
			await route.fulfill({ json: { spells: [{ ...result, index: "old", name: "Old result" }] } });
			completed.resolve();
		} else {
			await route.fulfill({
				json: { spells: [{ ...result, index: "new", name: `New bucket ${body.slotLevel}` }] },
			});
		}
	});
	try {
		await page.goto(`/characters/${id}`);
		await page.getByRole("button", { name: "Add cantrip or feature", exact: true }).click();
		await page.getByLabel("Search cantrips and features").fill("old");
		await expect.poll(() => oldStarted).toBe(true);
		await page.getByLabel("Search cantrips and features").fill("new");
		await expect(
			page.getByRole("dialog").getByRole("button", { name: /New bucket 0/ }),
		).toBeVisible();
		await page.getByRole("button", { name: "Close add spell dialog" }).click();
		await page.getByRole("button", { name: "Edit spells", exact: true }).click();
		await page.getByRole("button", { name: "Add spell to 1st-level", exact: true }).click();
		await expect(page.getByLabel("Search spells")).toHaveValue("");
		await page.getByLabel("Search spells").fill("new");
		await expect(
			page.getByRole("dialog").getByRole("button", { name: /New bucket 1/ }),
		).toBeVisible();
	} finally {
		release.resolve();
	}
	await completed.promise;
	await expect(
		page.getByRole("dialog").getByRole("button", { name: /New bucket 1/ }),
	).toBeVisible();
	await expect(page.getByText("Old result", { exact: true })).toHaveCount(0);
});

test("slot failure survives view changes and only an explicit use retry changes counts", async ({
	page,
}) => {
	const id = await createCharacter(page);
	const configured = await page.request.put(`/api/characters/${id}/spell-slots`, {
		data: { slots: [{ level: 1, total: 2 }] },
	});
	expect(configured.status()).toBe(200);
	let uses = 0;
	await page.route(`**/api/characters/${id}/spell-slots/use`, async (route) => {
		uses++;
		if (uses === 1) await route.fulfill({ status: 502, json: { error: "Use unavailable" } });
		else await route.continue();
	});
	await page.goto(`/characters/${id}`);
	await expect(page.getByText("2 / 2 remaining", { exact: true })).toBeVisible();
	await page.waitForLoadState("networkidle");
	const unrelatedReads: string[] = [];
	page.on("request", (request) => {
		const path = new URL(request.url()).pathname;
		if (
			request.method() === "GET" &&
			path.startsWith("/api/characters") &&
			!path.includes("/spells") &&
			!path.includes("/spell-slots")
		)
			unrelatedReads.push(path);
	});
	await page.getByRole("button", { name: "Use 1st-level", exact: true }).click();
	await expect(page.getByText("Spell slots unavailable", { exact: true })).toBeVisible();
	await expect(page.getByText("2 / 2 remaining", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Edit spells", exact: true }).click();
	await page.getByRole("button", { name: "Configure slots", exact: true }).click();
	await page.getByLabel("1st-level slot total", { exact: true }).fill("5");
	await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
	await page.getByRole("button", { name: "Done", exact: true }).click();
	await page.getByRole("button", { name: "Add cantrip or feature", exact: true }).click();
	await page.getByRole("button", { name: "Close add spell dialog" }).click();
	await expect(page.getByText("Spell slots unavailable", { exact: true })).toBeVisible();
	expect(uses).toBe(1);
	await page.getByRole("button", { name: "Use 1st-level", exact: true }).click();
	await expect(page.getByText("1 / 2 remaining", { exact: true })).toBeVisible();
	await expect(page.getByText("Spell slots unavailable", { exact: true })).toHaveCount(0);
	await expect(page.getByRole("button", { name: /Spell history/ })).toHaveCount(0);
	const persisted = await page.request.get(`/api/characters/${id}/spell-slots`);
	expect((await persisted.json()).recentSpellSlotChanges[0].action).toBe("used");
	await page.getByRole("button", { name: "Edit spells", exact: true }).click();
	await page.getByRole("button", { name: "Configure slots", exact: true }).click();
	await expect(page.getByLabel("1st-level slot total", { exact: true })).toHaveValue("2");
	expect(uses).toBe(2);
	expect(unrelatedReads).toEqual([]);
});

test("successful slot use and restore leave editing for the current character", async ({
	page,
}) => {
	const id = await createCharacter(page);
	const configured = await page.request.put(`/api/characters/${id}/spell-slots`, {
		data: { slots: [{ level: 1, total: 2 }] },
	});
	expect(configured.status()).toBe(200);
	await page.goto(`/characters/${id}`);
	await page.getByRole("button", { name: "Edit spells", exact: true }).click();
	await page.getByRole("button", { name: "Use 1st-level", exact: true }).click();
	await expect(page.getByText("1 / 2 remaining", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit spells", exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Edit spells", exact: true }).click();
	await page.getByRole("button", { name: "Restore 1st-level", exact: true }).click();
	await expect(page.getByText("2 / 2 remaining", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit spells", exact: true })).toBeVisible();
});

async function createCharacter(page: Page) {
	const response = await page.request.post("/api/characters", {
		data: { name: "Spell recovery", className: "Wizard", level: 3, maxHp: 10 },
	});
	expect(response.status()).toBe(201);
	return (await response.json()).character.id as string;
}

function barrier() {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
