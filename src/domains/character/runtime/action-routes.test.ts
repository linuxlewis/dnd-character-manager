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
	skills: [],
	spellSlots: [],
	equipment: [],
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

describe("Action routes", () => {
	it("POST damage reduces HP", async () => {
		const char = await createChar();
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/damage`,
			payload: { amount: 10 },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().hp.current).toBe(90);
	});

	it("POST damage 404 for missing", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters/missing/damage",
			payload: { amount: 10 },
		});
		expect(res.statusCode).toBe(404);
	});

	it("POST heal increases HP", async () => {
		const char = await createChar();
		await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/damage`,
			payload: { amount: 30 },
		});
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/heal`,
			payload: { amount: 10 },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().hp.current).toBe(80);
	});

	it("POST heal 404 for missing", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters/missing/heal",
			payload: { amount: 10 },
		});
		expect(res.statusCode).toBe(404);
	});

	it("POST skill toggle works", async () => {
		const char = await createChar({
			skills: [{ name: "Athletics", abilityKey: "STR", proficient: false }],
		});
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/skills/Athletics/toggle`,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().skills[0].proficient).toBe(true);
	});

	it("POST skill toggle 404 for missing", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters/missing/skills/Athletics/toggle",
		});
		expect(res.statusCode).toBe(404);
	});

	it("POST equipment adds item", async () => {
		const char = await createChar();
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment`,
			payload: { name: "Longsword", weight: 3, quantity: 1, equipped: false },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().equipment).toHaveLength(1);
		expect(res.json().equipment[0].name).toBe("Longsword");
	});

	it("POST equipment 404 for missing", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters/missing/equipment",
			payload: { name: "Sword", weight: 3, quantity: 1, equipped: false },
		});
		expect(res.statusCode).toBe(404);
	});

	it("DELETE equipment removes item", async () => {
		const char = await createChar();
		const addRes = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/equipment`,
			payload: { name: "Longsword", weight: 3, quantity: 1, equipped: false },
		});
		const itemId = addRes.json().equipment[0].id;
		const res = await app.inject({
			method: "DELETE",
			url: `/api/characters/${char.id}/equipment/${itemId}`,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().equipment).toHaveLength(0);
	});

	it("DELETE equipment 404 for missing", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: "/api/characters/missing/equipment/some-id",
		});
		expect(res.statusCode).toBe(404);
	});

	it("POST spell use works", async () => {
		const char = await createChar({ spellSlots: [{ level: 1, available: 4, used: 0 }] });
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/spells/1/use`,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().spellSlots[0].used).toBe(1);
	});

	it("POST spell use 404 for missing", async () => {
		const res = await app.inject({ method: "POST", url: "/api/characters/missing/spells/1/use" });
		expect(res.statusCode).toBe(404);
	});

	it("POST spell restore works", async () => {
		const char = await createChar({ spellSlots: [{ level: 1, available: 4, used: 2 }] });
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${char.id}/spells/1/restore`,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().spellSlots[0].used).toBe(1);
	});

	it("POST spell restore 404 for missing", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters/missing/spells/1/restore",
		});
		expect(res.statusCode).toBe(404);
	});

	it("POST long-rest restores all spell slots", async () => {
		const char = await createChar({
			spellSlots: [
				{ level: 1, available: 4, used: 3 },
				{ level: 2, available: 3, used: 2 },
			],
		});
		const res = await app.inject({ method: "POST", url: `/api/characters/${char.id}/long-rest` });
		expect(res.statusCode).toBe(200);
		expect(res.json().spellSlots[0].used).toBe(0);
		expect(res.json().spellSlots[1].used).toBe(0);
	});

	it("POST long-rest 404 for missing", async () => {
		const res = await app.inject({ method: "POST", url: "/api/characters/missing/long-rest" });
		expect(res.statusCode).toBe(404);
	});
});
