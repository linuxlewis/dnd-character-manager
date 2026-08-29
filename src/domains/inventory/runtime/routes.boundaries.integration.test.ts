import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";
import {
	createInventoryRouteDatabaseTracker,
	scopeRowCount,
	treasuryRowCount,
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

describe("character treasury route boundaries", () => {
	it("rolls back a failed first spend without creating scope or treasury rows", async () => {
		const cookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(app, cookie);

		const response = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/spend`,
			headers: { cookie },
			payload: {
				amount: { denomination: "cp", amount: 1 },
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
			},
		});

		expect(response.statusCode).toBe(409);
		expect(response.json().error).toMatchObject({ code: "INSUFFICIENT_FUNDS" });
		expect(await scopeRowCount(characterId)).toBe(0);
		expect(await treasuryRowCount(characterId)).toBe(0);
	});

	it("returns the stable not-found response for every inaccessible treasury operation", async () => {
		const ownerCookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(app, ownerCookie);
		const added = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie: ownerCookie },
			payload: {
				delta: { cp: 3, sp: 2, gp: 1, pp: 0 },
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
			},
		});
		expect(added.statusCode).toBe(200);

		const otherCookie = await database.createSessionCookie(app);
		const requests = [
			{
				method: "GET",
				url: `/api/characters/${characterId}/treasury`,
			},
			{
				method: "PUT",
				url: `/api/characters/${characterId}/treasury`,
				payload: {
					delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
					expectedPrevious: { cp: 3, sp: 2, gp: 1, pp: 0 },
				},
			},
			{
				method: "POST",
				url: `/api/characters/${characterId}/treasury/spend`,
				payload: {
					amount: { denomination: "cp", amount: 1 },
					expectedPrevious: { cp: 3, sp: 2, gp: 1, pp: 0 },
				},
			},
			{
				method: "POST",
				url: `/api/characters/${characterId}/treasury/convert`,
				payload: { from: "gp", to: "sp", amount: 1 },
			},
			{
				method: "POST",
				url: `/api/characters/${characterId}/treasury/preview/add`,
				payload: { delta: { cp: 1, sp: 0, gp: 0, pp: 0 } },
			},
			{
				method: "POST",
				url: `/api/characters/${characterId}/treasury/preview/spend`,
				payload: { amount: { denomination: "cp", amount: 1 } },
			},
		] as const;

		for (const request of requests) {
			const response = await app.inject({ ...request, headers: { cookie: otherCookie } });
			expect(response.statusCode).toBe(404);
			expect(response.json()).toEqual({ error: "Character not found." });
		}

		expect(await scopeRowCount(characterId)).toBe(1);
		expect(await treasuryRowCount(characterId)).toBe(1);
		const unchanged = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie: ownerCookie },
		});
		expect(unchanged.json().treasury.balances).toEqual({ cp: 3, sp: 2, gp: 1, pp: 0 });
	});

	it("returns normalized balances in a spend preview", async () => {
		const cookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(app, cookie);
		const added = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: {
				delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
			},
		});
		expect(added.statusCode).toBe(200);

		const preview = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/treasury/preview/spend`,
			headers: { cookie },
			payload: { amount: { denomination: "sp", amount: 5 } },
		});

		expect(preview.statusCode).toBe(200);
		expect(preview.json().preview).toMatchObject({
			canApply: true,
			next: { cp: 0, sp: 5, gp: 0, pp: 0 },
		});
		expect(preview.json().preview).not.toHaveProperty("change");
	});

	it("maps treasury overflow to the stable HTTP error response", async () => {
		const cookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(app, cookie);
		const maximum = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: {
				delta: { cp: 2_147_483_647, sp: 0, gp: 0, pp: 0 },
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
			},
		});
		expect(maximum.statusCode).toBe(200);

		const overflow = await app.inject({
			method: "PUT",
			url: `/api/characters/${characterId}/treasury`,
			headers: { cookie },
			payload: {
				delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
				expectedPrevious: { cp: 2_147_483_647, sp: 0, gp: 0, pp: 0 },
			},
		});
		expect(overflow.statusCode).toBe(400);
		expect(overflow.json()).toEqual({
			error: "The treasury balance exceeds the PostgreSQL integer limit.",
		});
	});
});

async function createCharacter(app: Awaited<ReturnType<typeof buildServer>>, cookie: string) {
	const response = await app.inject({
		method: "POST",
		url: "/api/characters",
		headers: { cookie },
		payload: { name: "Mira", className: "Fighter", level: 3, maxHp: 28 },
	});
	expect(response.statusCode).toBe(201);
	return response.json().character.id as string;
}
