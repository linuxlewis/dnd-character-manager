import { getDb } from "@providers/database/index.js";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";
import {
	createInventoryRouteDatabaseTracker,
	scopeRowCount,
} from "./routes.integration-helpers.js";

let app: Awaited<ReturnType<typeof buildServer>>;
const database = createInventoryRouteDatabaseTracker();

beforeAll(async () => {
	app = await buildServer();
});

beforeEach(() => database.reset());

afterAll(async () => {
	await database.cleanup();
	await app.close();
});

describe("character history route", () => {
	it("returns filtered pages with item and treasury entries in deterministic order", async () => {
		const cookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(cookie);

		const item = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/items`,
			headers: { cookie },
			payload: { name: "Rope", type: "misc", category: "Gear", properties: {} },
		});
		expect(item.statusCode).toBe(201);
		const treasury = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: {
				delta: { cp: 0, sp: 0, gp: 2, pp: 0 },
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
			},
		});
		expect(treasury.statusCode).toBe(200);
		const otherCharacterId = await createCharacter(cookie);
		const otherCharacterItem = await app.inject({
			method: "POST",
			url: `/api/characters/${otherCharacterId}/items`,
			headers: { cookie },
			payload: { name: "Lantern", type: "misc", category: "Gear", properties: {} },
		});
		expect(otherCharacterItem.statusCode).toBe(201);

		const initial = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history`,
			headers: { cookie },
		});
		expect(initial.statusCode).toBe(200);
		expect(initial.json()).toMatchObject({ total: 2, limit: 20, offset: 0, hasMore: false });
		expect(initial.json().entries[0].action).toBe("currency_updated");
		expect(initial.json().entries[1].action).toBe("item_added");
		for (const entry of initial.json().entries) {
			expect(entry).not.toHaveProperty("inventoryScopeId");
		}
		expect(initial.json().entries[0].details).toMatchObject({
			version: 1,
			operation: "add",
			requested: { delta: { cp: 0, sp: 0, gp: 2, pp: 0 } },
		});
		expect(initial.json().entries[1].details).toMatchObject({
			version: 1,
			item: { name: "Rope", quantity: 1 },
		});

		const otherUserCookie = await database.createSessionCookie(app);
		const otherUserHistory = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history`,
			headers: { cookie: otherUserCookie },
		});
		expect(otherUserHistory.statusCode).toBe(404);
		expect(otherUserHistory.json()).toEqual({ error: "Character not found." });

		const otherCharacterHistory = await app.inject({
			method: "GET",
			url: `/api/characters/${otherCharacterId}/history`,
			headers: { cookie },
		});
		expect(otherCharacterHistory.statusCode).toBe(200);
		expect(otherCharacterHistory.json()).toMatchObject({ total: 1, limit: 20, offset: 0 });
		expect(otherCharacterHistory.json().entries[0].details).toMatchObject({
			version: 1,
			item: { name: "Lantern" },
		});

		const itemPage = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history?action=item_added&entityType=item&limit=1`,
			headers: { cookie },
		});
		expect(itemPage.statusCode).toBe(200);
		expect(itemPage.json()).toMatchObject({ total: 1, limit: 1, offset: 0, hasMore: false });
		expect(itemPage.json().entries[0].entityType).toBe("item");

		const treasuryPage = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history?entityType=currency&offset=0&limit=1`,
			headers: { cookie },
		});
		expect(treasuryPage.statusCode).toBe(200);
		expect(treasuryPage.json()).toMatchObject({ total: 1, limit: 1, offset: 0, hasMore: false });
		expect(treasuryPage.json().entries[0].entityType).toBe("currency");

		const secondPage = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history?limit=1&offset=1`,
			headers: { cookie },
		});
		expect(secondPage.statusCode).toBe(200);
		expect(secondPage.json()).toMatchObject({ total: 2, limit: 1, offset: 1, hasMore: false });
		expect(secondPage.json().entries).toHaveLength(1);
		expect(secondPage.json().entries[0].action).toBe("item_added");

		const entryIds = initial.json().entries.map((entry: { id: string }) => entry.id);
		await getDb().execute(sql`
			UPDATE inventory_history_entries
			SET created_at = TIMESTAMPTZ '2026-08-29 12:00:00+00'
			WHERE id IN (${entryIds[0]}, ${entryIds[1]})
		`);
		const tied = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history?limit=2`,
			headers: { cookie },
		});
		expect(tied.json().entries.map((entry: { id: string }) => entry.id)).toEqual(
			[...entryIds].sort().reverse(),
		);
	});

	it("authorizes before scope access and returns empty typed pages without creating scope", async () => {
		const ownerCookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(ownerCookie);
		const empty = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history?limit=5&offset=3`,
			headers: { cookie: ownerCookie },
		});
		expect(empty.statusCode).toBe(200);
		expect(empty.json()).toEqual({ entries: [], total: 0, limit: 5, offset: 3, hasMore: false });
		expect(await scopeRowCount(characterId)).toBe(0);

		const otherCookie = await database.createSessionCookie(app);
		const inaccessible = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history`,
			headers: { cookie: otherCookie },
		});
		expect(inaccessible.statusCode).toBe(404);
		expect(inaccessible.json()).toEqual({ error: "Character not found." });
		expect(await scopeRowCount(characterId)).toBe(0);
	});

	it("rejects malformed query values with the typed validation response", async () => {
		const cookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(cookie);
		for (const query of [
			"limit=0",
			"limit=101",
			"offset=-1",
			"action=unknown",
			"entityType=unknown",
			"action=null",
			"entityType=null",
		]) {
			const response = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/history?${query}`,
				headers: { cookie },
			});
			expect(response.statusCode).toBe(400);
			expect(response.json()).toEqual({ error: "Invalid character history query." });
		}
	});

	it("maps a malformed persisted row to the internal error response", async () => {
		const cookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(cookie);
		const item = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/items`,
			headers: { cookie },
			payload: { name: "Rope", type: "misc", category: "Gear", properties: {} },
		});
		expect(item.statusCode).toBe(201);

		const history = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history`,
			headers: { cookie },
		});
		const [entry] = history.json().entries as Array<{ id: string }>;
		await getDb().execute(sql`
			UPDATE inventory_history_entries
			SET details = '{}'::jsonb
			WHERE id = ${entry.id}
		`);

		const response = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/history`,
			headers: { cookie },
		});
		expect(response.statusCode).toBe(500);
		expect(response.json()).toEqual({ error: "Character history operation failed." });
	});
});

async function createCharacter(cookie: string) {
	const response = await app.inject({
		method: "POST",
		url: "/api/characters",
		headers: { cookie },
		payload: { name: "Mira", className: "Fighter", level: 3, maxHp: 28 },
	});
	expect(response.statusCode).toBe(201);
	return response.json().character.id as string;
}
