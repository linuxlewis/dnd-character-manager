import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";
import { getDb } from "../../../providers/database/index.js";
import { createInventoryHistoryRepository } from "../repo/inventory-history-repository.js";
import { inventoryScopesTable } from "../repo/inventory-scope-table.js";
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

describe("character treasury history routes", () => {
	it("records trimmed notes, actor identity, and authoritative making-change details", async () => {
		const cookie = await database.createSessionCookie(app);
		const actor = await app.inject({
			method: "GET",
			url: "/api/current-user",
			headers: { cookie },
		});
		const created = await app.inject({
			method: "POST",
			url: "/api/characters",
			headers: { cookie },
			payload: { name: "Mira", className: "Fighter", level: 3, maxHp: 28 },
		});
		const characterId = created.json().character.id as string;
		const actorUserId = actor.json().user.id as string;

		const added = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: {
				delta: { cp: 0, sp: 0, gp: 0, pp: 2 },
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
				note: "  Reward from the guild  ",
			},
		});
		expect(added.statusCode).toBe(200);

		const spent = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/spend`,
			headers: { cookie },
			payload: {
				amount: { denomination: "gp", amount: 15 },
				expectedPrevious: added.json().treasury.balances,
				note: "  Bought climbing gear  ",
			},
		});
		expect(spent.statusCode).toBe(200);
		expect(spent.json().treasury.balances).toEqual({ cp: 0, sp: 0, gp: 5, pp: 0 });

		const [scope] = await getDb()
			.select({ id: inventoryScopesTable.id })
			.from(inventoryScopesTable)
			.where(eq(inventoryScopesTable.characterId, characterId));
		const history = await createInventoryHistoryRepository().listHistoryEntries(scope.id);
		expect(history.total).toBe(2);
		expect(history.entries.every((entry) => entry.actorUserId === actorUserId)).toBe(true);
		expect(history.entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					details: expect.objectContaining({
						operation: "add",
						requested: { delta: { cp: 0, sp: 0, gp: 0, pp: 2 } },
						note: "Reward from the guild",
					}),
				}),
				expect.objectContaining({
					details: expect.objectContaining({
						operation: "spend",
						previous: { cp: 0, sp: 0, gp: 0, pp: 2 },
						next: { cp: 0, sp: 0, gp: 5, pp: 0 },
						delta: { cp: 0, sp: 0, gp: 5, pp: -2 },
						requested: { amount: { denomination: "gp", amount: 15 } },
						note: "Bought climbing gear",
					}),
				}),
			]),
		);
	});

	it("does not create activity for rejected, stale, or zero treasury mutations", async () => {
		const cookie = await database.createSessionCookie(app);
		const created = await app.inject({
			method: "POST",
			url: "/api/characters",
			headers: { cookie },
			payload: { name: "Mira", className: "Fighter", level: 3, maxHp: 28 },
		});
		const characterId = created.json().character.id as string;

		const overspend = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/spend`,
			headers: { cookie },
			payload: {
				amount: { denomination: "gp", amount: 1 },
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
			},
		});
		expect(overspend.statusCode).toBe(409);
		expect(await scopeRowCount(characterId)).toBe(0);

		const addRequest = {
			delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
			expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
		};
		const added = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: addRequest,
		});
		expect(added.statusCode).toBe(200);

		const stale = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: addRequest,
		});
		expect(stale.statusCode).toBe(409);

		const zero = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: {
				delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
				expectedPrevious: added.json().treasury.balances,
			},
		});
		expect(zero.statusCode).toBe(400);

		const [scope] = await getDb()
			.select({ id: inventoryScopesTable.id })
			.from(inventoryScopesTable)
			.where(eq(inventoryScopesTable.characterId, characterId));
		expect((await createInventoryHistoryRepository().listHistoryEntries(scope.id)).total).toBe(1);
	});
});
