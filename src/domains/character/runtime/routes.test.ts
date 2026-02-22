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

describe("Character CRUD routes", () => {
	it("GET /api/characters returns empty array", async () => {
		const res = await app.inject({ method: "GET", url: "/api/characters" });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual([]);
	});

	it("POST /api/characters creates a character (201)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: validInput,
		});
		expect(res.statusCode).toBe(201);
		const body = res.json();
		expect(body.id).toBeDefined();
		expect(body.name).toBe("Gandalf");
	});

	it("GET /api/characters returns created characters", async () => {
		await app.inject({ method: "POST", url: "/api/characters", payload: validInput });
		const res = await app.inject({ method: "GET", url: "/api/characters" });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveLength(1);
	});

	it("GET /api/characters/:id returns character", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: validInput,
		});
		const { id } = createRes.json();
		const res = await app.inject({ method: "GET", url: `/api/characters/${id}` });
		expect(res.statusCode).toBe(200);
		expect(res.json().name).toBe("Gandalf");
	});

	it("GET /api/characters/:id returns 404 for missing", async () => {
		const res = await app.inject({ method: "GET", url: "/api/characters/nonexistent" });
		expect(res.statusCode).toBe(404);
	});

	it("PUT /api/characters/:id updates character", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: validInput,
		});
		const { id } = createRes.json();
		const res = await app.inject({
			method: "PUT",
			url: `/api/characters/${id}`,
			payload: { name: "Gandalf the White" },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().name).toBe("Gandalf the White");
	});

	it("PUT /api/characters/:id returns 404 for missing", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/api/characters/nonexistent",
			payload: { name: "Nobody" },
		});
		expect(res.statusCode).toBe(404);
	});

	it("DELETE /api/characters/:id returns 204", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: validInput,
		});
		const { id } = createRes.json();
		const res = await app.inject({ method: "DELETE", url: `/api/characters/${id}` });
		expect(res.statusCode).toBe(204);
	});

	it("DELETE /api/characters/:id returns 404 for missing", async () => {
		const res = await app.inject({ method: "DELETE", url: "/api/characters/nonexistent" });
		expect(res.statusCode).toBe(404);
	});

	it("POST /api/characters returns 400 for invalid data", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: { name: "" },
		});
		expect(res.statusCode).toBe(400);
	});
});
