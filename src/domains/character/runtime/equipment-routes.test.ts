import Fastify from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { characterRepo } from "../repo/character-repo.js";
import type { CreateCharacter } from "../types/index.js";
import { registerCharacterRoutes } from "./routes.js";

const validInput: CreateCharacter = {
	name: "Gandalf",
	race: "Human",
	class: "Wizard",
	level: 20,
	abilityScores: { STR: 10, DEX: 14, CON: 12, INT: 20, WIS: 18, CHA: 16 },
	hp: { current: 100, max: 100, temp: 0 },
	conditions: [],
	concentration: false,
	skills: [],
	spellSlots: [],
	equipment: [],
	armorClass: { base: 10, override: null },
	savingThrowProficiencies: [],
	notes: "",
};

const app = Fastify();

beforeAll(async () => {
	await registerCharacterRoutes(app);
	await app.ready();
});

afterEach(async () => {
	await characterRepo._clear();
});

afterAll(async () => {
	await app.close();
});

async function createChar(overrides = {}) {
	const res = await app.inject({
		method: "POST",
		url: "/api/characters",
		payload: { ...validInput, ...overrides },
	});
	return res.json();
}

describe("Equipment routes", () => {
	it("POST equipment adds item with category and description", async () => {
		const char = await createChar();
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment`,
			payload: {
				name: "Chain Mail",
				weight: 55,
				quantity: 1,
				category: "armor",
				description: "AC 16",
			},
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().equipment[0].category).toBe("armor");
		expect(res.json().equipment[0].description).toBe("AC 16");
	});

	it("POST equipment defaults category to gear", async () => {
		const char = await createChar();
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment`,
			payload: { name: "Rope", weight: 10, quantity: 1 },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().equipment[0].category).toBe("gear");
		expect(res.json().equipment[0].description).toBe("");
	});

	it("POST equipment toggle equips and unequips item", async () => {
		const char = await createChar();
		const addRes = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment`,
			payload: { name: "Longsword", weight: 3, quantity: 1, equipped: false },
		});
		const itemId = addRes.json().equipment[0].id;
		const equipRes = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment/${itemId}/toggle`,
		});
		expect(equipRes.statusCode).toBe(200);
		expect(equipRes.json().equipment[0].equipped).toBe(true);
		const unequipRes = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment/${itemId}/toggle`,
		});
		expect(unequipRes.statusCode).toBe(200);
		expect(unequipRes.json().equipment[0].equipped).toBe(false);
	});

	it("POST equipment toggle 404 for missing character", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters/missing/equipment/some-id/toggle",
		});
		expect(res.statusCode).toBe(404);
	});

	it("POST equipment toggle 400 for missing item", async () => {
		const char = await createChar();
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment/nonexistent/toggle`,
		});
		expect(res.statusCode).toBe(400);
	});

	it("PUT equipment item updates properties", async () => {
		const char = await createChar();
		const addRes = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment`,
			payload: { name: "Longsword", weight: 3, quantity: 1, category: "weapon" },
		});
		const itemId = addRes.json().equipment[0].id;
		const res = await app.inject({
			method: "PUT",
			url: `/api/characters/${char.id}/equipment/${itemId}`,
			payload: { name: "Magic Longsword", description: "+1 to attack" },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().equipment[0].name).toBe("Magic Longsword");
		expect(res.json().equipment[0].description).toBe("+1 to attack");
	});

	it("PUT equipment item 404 for missing character", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/api/characters/missing/equipment/some-id",
			payload: { name: "Test" },
		});
		expect(res.statusCode).toBe(404);
	});

	it("PUT equipment item 400 for missing item", async () => {
		const char = await createChar();
		const res = await app.inject({
			method: "PUT",
			url: `/api/characters/${char.id}/equipment/nonexistent`,
			payload: { name: "Test" },
		});
		expect(res.statusCode).toBe(400);
	});
});
