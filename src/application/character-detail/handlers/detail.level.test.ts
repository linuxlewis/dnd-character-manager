import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../../domains/characters/service/index.js";
import type { createCharacterDetailService } from "../workflows/character-detail.js";
import { registerCharacterDetailRoutes } from "./detail.js";

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

describe("registerCharacterRoutes level routes", () => {
	it("updates a character level for the current user", async () => {
		const services = fakeServices();
		const updatedCharacter = { ...character, level: 8 };
		services.characterService.updateCharacterLevel.mockResolvedValue(updatedCharacter);
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/level`,
				payload: { level: 8 },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ character: updatedCharacter });
			expect(services.characterService.updateCharacterLevel).toHaveBeenCalledWith(
				userId,
				character.id,
				{ level: 8 },
			);
		} finally {
			await app.close();
		}
	});

	it("rejects invalid character level updates before calling the service", async () => {
		const services = fakeServices();
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/level`,
				payload: { level: 21 },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toHaveProperty("error");
			expect(services.characterService.updateCharacterLevel).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it("returns not found when a character level update cannot find the character", async () => {
		const services = fakeServices();
		services.characterService.updateCharacterLevel.mockRejectedValue(new CharacterNotFoundError());
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "PUT",
				url: "/api/characters/00000000-0000-4000-8000-000000000099/level",
				payload: { level: 8 },
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
	await registerCharacterDetailRoutes(app, {
		characterService: services.characterService,
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

function fakeServices() {
	return {
		characterService: fakeService(),
	};
}

function fakeService() {
	return {
		getCharacter: vi.fn(),
		updateCharacterExperience: vi.fn(),
		updateCharacterLevel: vi.fn(),
		updateCharacterName: vi.fn(),
	} satisfies ReturnType<typeof createCharacterDetailService>;
}
