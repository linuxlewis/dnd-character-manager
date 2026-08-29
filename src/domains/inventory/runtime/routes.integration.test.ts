import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";
import {
	cleanupInventoryRouteDatabase,
	createSessionCookie,
	resetInventoryRouteDatabase,
	scopeRowCount,
	treasuryRowCount,
} from "./routes.integration-helpers.js";

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
	app = await buildServer();
});

beforeEach(resetInventoryRouteDatabase);

afterAll(async () => {
	await cleanupInventoryRouteDatabase();
	await app.close();
});

describe("character treasury routes", () => {
	it("authorizes by session, persists operations, and keeps characters isolated", async () => {
		const cookie = await createSessionCookie(app);
		const created = await app.inject({
			method: "POST",
			url: "/api/characters",
			headers: { cookie },
			payload: { name: "Mira", className: "Fighter", level: 3, maxHp: 28 },
		});
		const characterId = created.json().character.id;

		const zero = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
		});
		expect(zero.statusCode).toBe(200);
		expect(zero.json().treasury.balances).toEqual({ cp: 0, sp: 0, gp: 0, pp: 0 });
		expect(await scopeRowCount(characterId)).toBe(0);
		expect(await treasuryRowCount(characterId)).toBe(0);

		const addPreview = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/preview/add`,
			headers: { cookie },
			payload: { delta: { cp: 5, sp: 9, gp: 1, pp: 0 } },
		});
		expect(addPreview.statusCode).toBe(200);
		expect(addPreview.json().preview.canApply).toBe(true);
		expect(addPreview.json().preview).not.toHaveProperty("change");
		expect(await scopeRowCount(characterId)).toBe(0);
		const addExpectedPrevious = addPreview.json().preview.previous;

		const added = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: {
				delta: { cp: 5, sp: 9, gp: 1, pp: 0 },
				expectedPrevious: addExpectedPrevious,
			},
		});
		expect(added.statusCode).toBe(200);
		expect(added.json().treasury.balances).toEqual({ cp: 5, sp: 9, gp: 1, pp: 0 });
		expect(added.json().change.previous).toEqual(addExpectedPrevious);

		const spendPreview = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/preview/spend`,
			headers: { cookie },
			payload: { amount: { denomination: "sp", amount: 15 } },
		});
		expect(spendPreview.statusCode).toBe(200);
		expect(spendPreview.json().preview).toMatchObject({
			canApply: true,
			next: { cp: 5, sp: 4, gp: 0, pp: 0 },
		});
		expect(spendPreview.json().preview).not.toHaveProperty("change");
		const spendExpectedPrevious = spendPreview.json().preview.previous;

		const spent = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/spend`,
			headers: { cookie },
			payload: {
				amount: { denomination: "sp", amount: 15 },
				expectedPrevious: spendExpectedPrevious,
			},
		});
		expect(spent.statusCode).toBe(200);
		expect(spent.json().change).toMatchObject({
			previous: spendExpectedPrevious,
			next: { cp: 5, sp: 4, gp: 0, pp: 0 },
		});
		expect(spent.json().change.change).toBeUndefined();
		expect(spent.json().treasury.totalValue).toEqual({ copper: 45, gp: 0.45 });

		const insufficientPreview = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/preview/spend`,
			headers: { cookie },
			payload: { amount: { denomination: "gp", amount: 1 } },
		});
		expect(insufficientPreview.statusCode).toBe(200);
		expect(insufficientPreview.json().preview).toMatchObject({
			canApply: false,
			error: { code: "INSUFFICIENT_FUNDS" },
		});

		const insufficient = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/spend`,
			headers: { cookie },
			payload: {
				amount: { denomination: "gp", amount: 1 },
				expectedPrevious: insufficientPreview.json().preview.previous,
			},
		});
		expect(insufficient.statusCode).toBe(409);
		expect(insufficient.json().error.code).toBe("INSUFFICIENT_FUNDS");

		const converted = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/convert`,
			headers: { cookie },
			payload: { from: "sp", to: "cp", amount: 4 },
		});
		expect(converted.statusCode).toBe(200);
		expect(converted.json().treasury.balances).toEqual({ cp: 45, sp: 0, gp: 0, pp: 0 });

		const second = await app.inject({
			method: "POST",
			url: "/api/characters",
			headers: { cookie },
			payload: { name: "Tamsin", className: "Wizard", level: 2, maxHp: 18 },
		});
		const secondTreasury = await app.inject({
			method: "GET",
			url: `/api/characters/${second.json().character.id}/treasury`,
			headers: { cookie },
		});
		expect(secondTreasury.json().treasury.totalValue).toEqual({ copper: 0, gp: 0 });

		const otherCookie = await createSessionCookie(app);
		const inaccessible = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie: otherCookie },
		});
		expect(inaccessible.statusCode).toBe(404);
	});

	it("rejects stale confirmations and replays without applying another mutation", async () => {
		const cookie = await createSessionCookie(app);
		const created = await app.inject({
			method: "POST",
			url: "/api/characters",
			headers: { cookie },
			payload: { name: "Mira", className: "Fighter", level: 3, maxHp: 28 },
		});
		const characterId = created.json().character.id;
		const previewAdd = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/preview/add`,
			headers: { cookie },
			payload: { delta: { cp: 2, sp: 0, gp: 0, pp: 0 } },
		});
		const addRequest = {
			delta: { cp: 2, sp: 0, gp: 0, pp: 0 },
			expectedPrevious: previewAdd.json().preview.previous,
		};
		const firstAdd = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: addRequest,
		});
		expect(firstAdd.statusCode).toBe(200);

		const replay = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: addRequest,
		});
		expect(replay.statusCode).toBe(409);
		expect(replay.json().error).toMatchObject({
			code: "TREASURY_CONFLICT",
			expectedPrevious: addRequest.expectedPrevious,
			actualPrevious: { cp: 2, sp: 0, gp: 0, pp: 0 },
		});

		const spendPreview = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/preview/spend`,
			headers: { cookie },
			payload: { amount: { denomination: "cp", amount: 1 } },
		});
		const concurrentAdd = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: {
				delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
				expectedPrevious: { cp: 2, sp: 0, gp: 0, pp: 0 },
			},
		});
		expect(concurrentAdd.statusCode).toBe(200);

		const staleSpend = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/spend`,
			headers: { cookie },
			payload: {
				amount: { denomination: "cp", amount: 1 },
				expectedPrevious: spendPreview.json().preview.previous,
			},
		});
		expect(staleSpend.statusCode).toBe(409);
		expect(staleSpend.json().error.code).toBe("TREASURY_CONFLICT");

		const treasury = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
		});
		expect(treasury.json().treasury.balances).toEqual({ cp: 3, sp: 0, gp: 0, pp: 0 });
	});

	it("returns 400 for malformed UUIDs and request bodies", async () => {
		const cookie = await createSessionCookie(app);
		const invalidPath = await app.inject({
			method: "GET",
			url: "/api/characters/not-a-uuid/treasury",
			headers: { cookie },
		});
		const invalidBody = await app.inject({
			method: "PUT",
			url: "/api/characters/00000000-0000-4000-8000-000000000001/treasury",
			headers: { cookie },
			payload: { delta: { cp: -1, sp: 0, gp: 0, pp: 0 } },
		});
		expect(invalidPath.statusCode).toBe(400);
		expect(invalidBody.statusCode).toBe(400);
	});
});
