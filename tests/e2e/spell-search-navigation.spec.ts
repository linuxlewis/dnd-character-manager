import { expect, test } from "@playwright/test";

test("spell search rows stay fixed, retain scroll on return, and add only when the row is tapped", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 740 });
	const created = await page.request.post("/api/characters", {
		data: { name: "Search navigation", className: "Wizard", level: 3, maxHp: 20 },
	});
	expect(created.status()).toBe(201);
	const id = (await created.json()).character.id;
	const spells = Array.from({ length: 8 }, (_, index) => ({
		index: `preview-${index}`,
		name:
			index === 7
				? "A very long spell name for checking fixed search row heights"
				: `Preview ${index}`,
		source: "spell",
		level: 0,
		url: `/api/2014/spells/preview-${index}`,
	}));
	let saves = 0;
	await page.route(`**/api/characters/${id}/spells/search`, (route) =>
		route.fulfill({ json: { spells } }),
	);
	await page.route("**/spell-search-details?*", (route) => {
		const index = new URL(route.request().url()).searchParams.get("spellIndex");
		const spell = spells.find((entry) => entry.index === index);
		return route.fulfill({
			json: {
				...spell,
				desc: ["This is a long description. ".repeat(30)],
				higherLevel: [],
				metadata: [{ label: "Range", value: "120 feet" }],
			},
		});
	});
	await page.route(`**/api/characters/${id}/spells`, async (route) => {
		if (route.request().method() !== "POST") return route.continue();
		saves++;
		expect(route.request().postDataJSON()).toEqual({
			slotLevel: 0,
			spellIndex: "preview-7",
			source: "spell",
		});
		await route.fulfill({ json: { spells: [] } });
	});
	await page.goto(`/characters/${id}/spells`);
	await page.getByRole("button", { name: "Add cantrip or feature", exact: true }).click();
	await page.getByLabel("Search cantrips and features").fill("preview");
	const first = page.getByRole("button", { name: "Add Preview 0", exact: true });
	await expect(first).toContainText("This is a long description.");
	const firstHeight = (await first.boundingBox())?.height;
	expect(firstHeight).toBeLessThanOrEqual(120);
	const more = page.getByRole("button", {
		name: `View details for ${spells[7].name}`,
		exact: true,
	});
	await more.scrollIntoViewIfNeeded();
	const results = page.getByTestId("spell-search-results");
	const scrollTop = await results.evaluate((element) => element.scrollTop);
	expect(scrollTop).toBeGreaterThan(0);
	await more.click();
	await expect(page.getByRole("button", { name: "Back to search" })).toBeFocused();
	await expect(page.getByText("120 feet", { exact: true })).toBeVisible();
	expect(saves).toBe(0);
	await page.getByRole("button", { name: "Back to search" }).click();
	await expect(more).toBeFocused();
	await expect(page.getByLabel("Search cantrips and features")).toHaveValue("preview");
	expect(await results.evaluate((element) => element.scrollTop)).toBe(scrollTop);
	const last = page.getByRole("button", { name: `Add ${spells[7].name}`, exact: true });
	expect((await last.boundingBox())?.height).toBe(firstHeight);
	await expect(last).toContainText("This is a long description.");
	await last.click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	expect(saves).toBe(1);
});
