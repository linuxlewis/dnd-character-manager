import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";
import {
	catalogueSpellsTable,
	createCatalogueSpellRepository,
} from "../../catalogue/repo/index.js";

const createdUserIds: string[] = [];
const seededSpellIndexes = ["staggering-smite-test"];

afterEach(async () => {
	resetAuthForTest();
	await getDb()
		.delete(catalogueSpellsTable)
		.where(inArray(catalogueSpellsTable.spellIndex, seededSpellIndexes));
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
	await closeDb();
});

describe("character spell routes with local catalogue data", () => {
	it("searches, saves, and loads details from seeded SRD 2024 catalogue spells", async () => {
		await createCatalogueSpellRepository().upsertSpells([staggeringSmiteSeed()]);
		const app = await buildServer();

		try {
			const cookie = await createSessionCookie(app);
			const created = await app.inject({
				method: "POST",
				url: "/api/characters",
				headers: { cookie },
				payload: {
					name: "Seren",
					className: "Paladin",
					level: 9,
					maxHp: 68,
				},
			});
			const character = created.json().character;

			const searchResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spells/search`,
				headers: { cookie },
				payload: { slotLevel: 4, query: "staggering" },
			});
			expect(searchResponse.statusCode).toBe(200);
			expect(searchResponse.json()).toEqual({
				spells: [
					{
						index: "staggering-smite-test",
						name: "Staggering Smite",
						level: 4,
						url: "/api/2024/spells/staggering-smite-test",
						source: "spell",
					},
				],
			});

			const saveResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spells`,
				headers: { cookie },
				payload: {
					slotLevel: 4,
					spellIndex: "staggering-smite-test",
					source: "spell",
				},
			});
			expect(saveResponse.statusCode).toBe(200);
			const savedSpell = saveResponse.json().spells[0];
			expect(savedSpell).toMatchObject({
				slotLevel: 4,
				spellIndex: "staggering-smite-test",
				name: "Staggering Smite",
				level: 4,
				url: "/api/2024/spells/staggering-smite-test",
				source: "spell",
			});

			const detailsResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}/spells/${savedSpell.id}`,
				headers: { cookie },
			});
			expect(detailsResponse.statusCode).toBe(200);
			expect(detailsResponse.json().spell).toMatchObject({
				spellIndex: "staggering-smite-test",
				name: "Staggering Smite",
				desc: ["You empower your strike with mind-rattling force."],
				higherLevel: ["The psychic damage increases with higher spell slots."],
				metadata: [{ label: "Casting Time", value: "Bonus Action" }],
			});
		} finally {
			await app.close();
		}
	});
});

async function createSessionCookie(app: Awaited<ReturnType<typeof buildServer>>) {
	const response = await app.inject({ method: "GET", url: "/api/current-user" });
	if (response.statusCode !== 200) {
		throw new Error(`Current user setup failed with ${response.statusCode}: ${response.body}`);
	}
	const userId = response.json().user.id;
	createdUserIds.push(userId);
	return toCookieHeader(response.headers["set-cookie"]);
}

function staggeringSmiteSeed() {
	return {
		source: "foundry-dnd5e" as const,
		sourceKey: "test-staggering-smite",
		sourcePath: "packs/_source/spells24/4th-level/staggering-smite.yml",
		rulesVersion: "2024" as const,
		license: "CC-BY-4.0",
		spellIndex: "staggering-smite-test",
		name: "Staggering Smite",
		level: 4,
		url: "/api/2024/spells/staggering-smite-test",
		desc: ["You empower your strike with mind-rattling force."],
		higherLevel: ["The psychic damage increases with higher spell slots."],
		metadata: [{ label: "Casting Time", value: "Bonus Action" }],
		sourcePayload: { system: { identifier: "staggering-smite-test" } },
		sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
		capability: "spells" as const,
		pack: "spells24" as const,
		sourceUrl:
			"https://raw.githubusercontent.com/foundryvtt/dnd5e/f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6/packs/_source/spells24/4th-level/staggering-smite.yml",
	};
}

function toCookieHeader(setCookie: string | string[] | undefined) {
	const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
	return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
