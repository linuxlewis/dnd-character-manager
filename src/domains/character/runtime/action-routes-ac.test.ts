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

describe("Action routes - AC and saving throws", () => {
	it("PUT /ac sets override and returns updated character", async () => {
		const create = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: validInput,
		});
		const id = create.json().id;
		const res = await app.inject({
			method: "PUT",
			url: `/api/characters/${id}/ac`,
			payload: { override: 16 },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().armorClass.override).toBe(16);
	});

	it("PUT /ac clears override with null", async () => {
		const create = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: validInput,
		});
		const id = create.json().id;
		await app.inject({
			method: "PUT",
			url: `/api/characters/${id}/ac`,
			payload: { override: 16 },
		});
		const res = await app.inject({
			method: "PUT",
			url: `/api/characters/${id}/ac`,
			payload: { override: null },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().armorClass.override).toBeNull();
	});

	it("PUT /ac returns 404 for missing character", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/api/characters/missing/ac",
			payload: { override: 16 },
		});
		expect(res.statusCode).toBe(404);
	});

	it("POST saving-throws toggle adds proficiency if not present", async () => {
		const create = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: validInput,
		});
		const id = create.json().id;
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${id}/saving-throws/STR/toggle`,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().savingThrowProficiencies).toContain("STR");
	});

	it("POST saving-throws toggle removes proficiency if already present", async () => {
		const create = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: validInput,
		});
		const id = create.json().id;
		await app.inject({
			method: "POST",
			url: `/api/characters/${id}/saving-throws/STR/toggle`,
		});
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${id}/saving-throws/STR/toggle`,
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().savingThrowProficiencies).not.toContain("STR");
	});

	it("POST saving-throws toggle returns 404 for missing character", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters/missing/saving-throws/STR/toggle",
		});
		expect(res.statusCode).toBe(404);
	});
});
