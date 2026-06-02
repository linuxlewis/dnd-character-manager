import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { CharacterService } from "../service/index.js";
import { registerCharacterRoutes, toCharacterResponse } from "./routes.js";

const userId = "00000000-0000-4000-8000-000000000001";
const character = {
	id: "00000000-0000-4000-8000-000000000002",
	userId,
	name: "Nyx",
	class: "Warlock" as const,
	level: 6,
	createdAt: new Date("2026-05-31T12:00:00.000Z"),
	updatedAt: new Date("2026-05-31T12:30:00.000Z"),
};

describe("toCharacterResponse", () => {
	it("serializes service characters as JSON-safe responses", () => {
		expect(toCharacterResponse(character)).toEqual({
			id: character.id,
			name: "Nyx",
			class: "Warlock",
			level: 6,
			createdAt: "2026-05-31T12:00:00.000Z",
			updatedAt: "2026-05-31T12:30:00.000Z",
		});
	});
});

describe("registerCharacterRoutes", () => {
	it("creates a character for the current user", async () => {
		const service = fakeService();
		service.createCharacter.mockResolvedValue(character);
		const app = await buildApp(service);

		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/characters",
				payload: { name: " Nyx ", class: "Warlock", level: 6 },
			});

			expect(response.statusCode).toBe(201);
			expect(response.json()).toMatchObject({ name: "Nyx", class: "Warlock", level: 6 });
			expect(service.createCharacter).toHaveBeenCalledWith({
				userId,
				character: { name: "Nyx", class: "Warlock", level: 6 },
			});
		} finally {
			await app.close();
		}
	});

	it("rejects invalid create payloads before calling the service", async () => {
		const service = fakeService();
		const app = await buildApp(service);

		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/characters",
				payload: { name: "", class: "Commoner", level: 0 },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toHaveProperty("error");
			expect(service.createCharacter).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it("lists and reads characters for the current user", async () => {
		const service = fakeService();
		service.listCharacters.mockResolvedValue([character]);
		service.getCharacter.mockResolvedValue(character);
		const app = await buildApp(service);

		try {
			const listResponse = await app.inject({ method: "GET", url: "/api/characters" });
			const detailResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}`,
			});

			expect(listResponse.json()).toHaveLength(1);
			expect(detailResponse.json()).toMatchObject({ id: character.id, name: "Nyx" });
		} finally {
			await app.close();
		}
	});

	it("returns not found for a missing character", async () => {
		const service = fakeService();
		service.getCharacter.mockResolvedValue(null);
		const app = await buildApp(service);

		try {
			const response = await app.inject({
				method: "GET",
				url: "/api/characters/00000000-0000-4000-8000-000000000099",
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toEqual({ error: "Character not found." });
		} finally {
			await app.close();
		}
	});
});

async function buildApp(service: ReturnType<typeof fakeService>) {
	const app = Fastify();
	await registerCharacterRoutes(app, {
		service,
		getCurrentUser: async () => ({
			user: {
				id: userId,
				isAnonymous: true,
				name: "Anonymous",
			},
		}),
	});
	return app;
}

function fakeService() {
	return {
		createCharacter: vi.fn(),
		getCharacter: vi.fn(),
		listCharacters: vi.fn(),
	} satisfies CharacterService;
}
