import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";
import { createInventoryRouteDatabaseTracker } from "./routes.integration-helpers.js";

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

describe("character item routes", () => {
	it("persists personal item CRUD and equipment state", async () => {
		const cookie = await database.createSessionCookie(app);
		const characterId = await createCharacter(cookie);
		const created = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/items`,
			headers: { cookie },
			payload: {
				name: "Longsword",
				type: "equipment",
				category: "Weapons",
				quantity: 1,
				properties: {},
			},
		});
		expect(created.statusCode).toBe(201);
		const itemId = created.json().item.id;

		const listed = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/items?search=sword&isEquipped=false`,
			headers: { cookie },
		});
		expect(listed.statusCode).toBe(200);
		expect(listed.json()).toMatchObject({ total: 1, items: [{ id: itemId, isEquipped: false }] });

		const updated = await app.inject({
			method: "PATCH",
			url: `/api/characters/${characterId}/items/${itemId}`,
			headers: { cookie },
			payload: { notes: "Polished", properties: {} },
		});
		expect(updated.statusCode).toBe(200);
		expect(updated.json().item.notes).toBe("Polished");

		const equipped = await app.inject({
			method: "POST",
			url: `/api/characters/${characterId}/items/${itemId}/equip`,
			headers: { cookie },
		});
		expect(equipped.statusCode).toBe(200);
		expect(equipped.json().item.isEquipped).toBe(true);

		const removed = await app.inject({
			method: "DELETE",
			url: `/api/characters/${characterId}/items/${itemId}`,
			headers: { cookie },
		});
		expect(removed.statusCode).toBe(204);

		const detail = await app.inject({
			method: "GET",
			url: `/api/characters/${characterId}/items/${itemId}`,
			headers: { cookie },
		});
		expect(detail.statusCode).toBe(404);
	});

	it("does not expose an item across characters or sessions", async () => {
		const ownerCookie = await database.createSessionCookie(app);
		const firstCharacterId = await createCharacter(ownerCookie);
		const secondCharacterId = await createCharacter(ownerCookie);
		const created = await app.inject({
			method: "POST",
			url: `/api/characters/${firstCharacterId}/items`,
			headers: { cookie: ownerCookie },
			payload: { name: "Rope", type: "misc", category: "Gear", properties: {} },
		});
		const itemId = created.json().item.id;

		const otherCharacter = await app.inject({
			method: "GET",
			url: `/api/characters/${secondCharacterId}/items/${itemId}`,
			headers: { cookie: ownerCookie },
		});
		const otherCookie = await database.createSessionCookie(app);
		const inaccessible = await app.inject({
			method: "GET",
			url: `/api/characters/${firstCharacterId}/items/${itemId}`,
			headers: { cookie: otherCookie },
		});

		expect(otherCharacter.statusCode).toBe(404);
		expect(inaccessible.statusCode).toBe(404);
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
