import { type APIResponse, expect, type Page } from "@playwright/test";

export const mobileFixtureVersion = "F2-main-v1";
export const mobileFixtureName = "Mira Thorn";

export async function prepareMobileWorkspace(page: Page) {
	await page.goto("/");
	const created = await checked(
		await page.request.post("/api/characters", {
			data: { name: mobileFixtureName, className: "Wizard", level: 3, maxHp: 24 },
		}),
	);
	const id: string = created.character.id;
	const root = `/api/characters/${id}`;
	await checked(await page.request.put(`${root}/experience`, { data: { experiencePoints: 2196 } }));
	// Main adds the temporary-HP delta to current HP. Set it before fixing the returned total.
	await checked(
		await page.request.put(`${root}/health`, {
			data: { currentHp: 18, maxHp: 24, temporaryHp: 3 },
		}),
	);
	const health = await checked(
		await page.request.put(`${root}/health`, {
			data: { currentHp: 18, maxHp: 24, temporaryHp: 3 },
		}),
	);
	expect(health.health).toEqual({ currentHp: 18, maxHp: 24, temporaryHp: 3, effectiveMaxHp: 27 });
	await checked(
		await page.request.put(`${root}/spell-slots`, {
			data: {
				slots: [
					{ level: 1, total: 4 },
					{ level: 2, total: 2 },
				],
			},
		}),
	);
	for (const entry of [
		{ query: "light", slotLevel: 0, source: "spell" },
		{ query: "lay on hands", slotLevel: 0, source: "feature" },
		{ query: "divine smite", slotLevel: 1, source: "spell" },
	]) {
		const found = await checked(
			await page.request.post(`${root}/spells/search`, {
				data: { query: entry.query, slotLevel: entry.slotLevel },
			}),
		);
		const spell = found.spells.find((value: { source: string }) => value.source === entry.source);
		expect(spell, `loopback catalogue fixture ${entry.query}`).toBeTruthy();
		await checked(
			await page.request.post(`${root}/spells`, {
				data: { slotLevel: entry.slotLevel, spellIndex: spell.index, source: entry.source },
			}),
		);
	}
	for (let index = 0; index < 12; index++) {
		const name =
			index === 0
				? "Quarterstaff"
				: index === 11
					? "Explorer's pack with a remarkably long descriptive name for narrow mobile screens"
					: `Travel supply ${String(index).padStart(2, "0")}`;
		const item = await checked(
			await page.request.post(`${root}/items`, {
				data: {
					name,
					type: index % 2 === 0 ? "equipment" : "potion",
					category: index % 2 === 0 ? "Equipment" : "Potion",
					quantity: index + 1,
					properties: {},
					catalogueItemId: null,
				},
			}),
		);
		if (index === 0) await checked(await page.request.post(`${root}/items/${item.item.id}/equip`));
	}
	await checked(
		await page.request.put(`${root}/treasury`, {
			data: { delta: { pp: 1, gp: 12, sp: 4, cp: 8 } },
		}),
	);
	return { id, path: `/characters/${id}`, fixture: mobileFixtureVersion };
}

async function checked(response: APIResponse) {
	expect(response.ok(), `${response.url()}: ${await response.text()}`).toBeTruthy();
	return response.json();
}
