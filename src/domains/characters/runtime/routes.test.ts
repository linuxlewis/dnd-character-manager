import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
	type CharacterHealthService,
	CharacterNotFoundError,
	type CharacterService,
} from "../service/index.js";
import { registerCharacterRoutes } from "./routes.js";

const userId = "00000000-0000-4000-8000-000000000001";
const character = {
	id: "00000000-0000-4000-8000-000000000002",
	name: "Nyx",
	className: "Warlock",
	level: 6,
	health: {
		currentHp: 33,
		maxHp: 28,
		temporaryHp: 5,
		effectiveMaxHp: 33,
	},
	recentHealthChanges: [],
};

describe("registerCharacterRoutes", () => {
	it("creates a character for the current user", async () => {
		const services = fakeServices();
		const service = services.characterService;
		service.createCharacter.mockResolvedValue(character);
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/characters",
				payload: { name: " Nyx ", className: "Warlock", level: 6, maxHp: 28 },
			});

			expect(response.statusCode).toBe(201);
			expect(response.json()).toEqual({ character });
			expect(service.createCharacter).toHaveBeenCalledWith(userId, {
				name: " Nyx ",
				className: "Warlock",
				level: 6,
				maxHp: 28,
			});
		} finally {
			await app.close();
		}
	});

	it("rejects invalid create payloads before calling the service", async () => {
		const services = fakeServices();
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/characters",
				payload: { name: "", className: "", level: 0, maxHp: 0 },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toHaveProperty("error");
			expect(services.characterService.createCharacter).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it("lists and reads characters for the current user", async () => {
		const services = fakeServices();
		const service = services.characterService;
		service.listCharacters.mockResolvedValue([character]);
		service.getCharacter.mockResolvedValue(character);
		const app = await buildApp(services);

		try {
			const listResponse = await app.inject({ method: "GET", url: "/api/characters" });
			const detailResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}`,
			});

			expect(listResponse.json()).toEqual({ characters: [character] });
			expect(detailResponse.json()).toEqual({ character });
		} finally {
			await app.close();
		}
	});

	it("updates character health for the current user", async () => {
		const services = fakeServices();
		services.characterHealthService.updateCharacterHealth.mockResolvedValue({
			health: character.health,
			recentHealthChanges: [],
		});
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/health`,
				payload: { currentHp: 28, maxHp: 28, temporaryHp: 5 },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				health: character.health,
				recentHealthChanges: [],
			});
			expect(services.characterHealthService.updateCharacterHealth).toHaveBeenCalledWith(
				userId,
				character.id,
				{ currentHp: 28, maxHp: 28, temporaryHp: 5 },
			);
		} finally {
			await app.close();
		}
	});

	it("returns not found for a missing character", async () => {
		const services = fakeServices();
		const service = services.characterService;
		service.getCharacter.mockRejectedValue(new CharacterNotFoundError());
		const app = await buildApp(services);

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

async function buildApp(services: ReturnType<typeof fakeServices>) {
	const app = Fastify();
	await registerCharacterRoutes(app, {
		characterService: services.characterService,
		characterHealthService: services.characterHealthService,
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
		transferCharactersToUser: vi.fn(),
	} satisfies CharacterService;
}

function fakeHealthService() {
	return {
		updateCharacterHealth: vi.fn(),
	} satisfies CharacterHealthService;
}

function fakeServices() {
	return {
		characterService: fakeService(),
		characterHealthService: fakeHealthService(),
	};
}
