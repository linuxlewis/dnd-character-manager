import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { CharacterAttributesService } from "../service/index.js";
import { CharacterNotFoundError } from "../service/index.js";
import { registerCharacterRoutes } from "./routes.js";

const userId = "00000000-0000-4000-8000-000000000001";
const characterId = "00000000-0000-4000-8000-000000000002";
const attributes = { attributes: { scores: { strength: 10 } } };

describe("character attribute routes", () => {
	it("reads and atomically updates attributes for the current user", async () => {
		const service = fakeService();
		service.getCharacterAttributes.mockResolvedValue(attributes);
		service.updateCharacterAttributes.mockResolvedValue(attributes);
		const app = await buildApp(service);

		try {
			const getResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/attributes`,
			});
			const updateResponse = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/attributes`,
				payload: validInput(),
			});

			expect(getResponse.statusCode).toBe(200);
			expect(getResponse.json()).toEqual(attributes);
			expect(updateResponse.statusCode).toBe(200);
			expect(updateResponse.json()).toEqual(attributes);
			expect(service.updateCharacterAttributes).toHaveBeenCalledWith(
				userId,
				characterId,
				validInput(),
			);
		} finally {
			await app.close();
		}
	});

	it("rejects invalid bodies before calling the service", async () => {
		const service = fakeService();
		const app = await buildApp(service);

		try {
			const response = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/attributes`,
				payload: { scores: { strength: 31 } },
			});

			expect(response.statusCode).toBe(400);
			expect(service.updateCharacterAttributes).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it("rejects malformed character ids before calling the GET service", async () => {
		const service = fakeService();
		const app = await buildApp(service);

		try {
			const response = await app.inject({
				method: "GET",
				url: "/api/characters/not-a-uuid/attributes",
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toEqual({ error: "Invalid character path." });
			expect(service.getCharacterAttributes).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it("maps inaccessible characters to the existing not-found response", async () => {
		const service = fakeService();
		service.getCharacterAttributes.mockRejectedValue(new CharacterNotFoundError());
		service.updateCharacterAttributes.mockRejectedValue(new CharacterNotFoundError());
		const app = await buildApp(service);

		try {
			const getResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/attributes`,
			});
			const updateResponse = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/attributes`,
				payload: validInput(),
			});

			expect(getResponse.statusCode).toBe(404);
			expect(updateResponse.statusCode).toBe(404);
		} finally {
			await app.close();
		}
	});
});

async function buildApp(characterAttributesService: CharacterAttributesService) {
	const app = Fastify();
	await registerCharacterRoutes(app, {
		characterAttributesService,
		getCurrentUser: async () => ({
			user: { id: userId, isAnonymous: true, name: "Anonymous" },
		}),
	});
	return app;
}

function fakeService() {
	return {
		getCharacterAttributes: vi.fn(),
		updateCharacterAttributes: vi.fn(),
	} satisfies CharacterAttributesService;
}

function validInput() {
	return {
		scores: {
			strength: 10,
			dexterity: 10,
			constitution: 10,
			intelligence: 10,
			wisdom: 10,
			charisma: 10,
		},
		savingThrowProficiencies: [
			"strength",
			"dexterity",
			"constitution",
			"intelligence",
			"wisdom",
			"charisma",
		].map((key) => ({ key, rank: "none" })),
		skillProficiencies: [
			"athletics",
			"acrobatics",
			"sleight-of-hand",
			"stealth",
			"arcana",
			"history",
			"investigation",
			"nature",
			"religion",
			"animal-handling",
			"insight",
			"medicine",
			"perception",
			"survival",
			"deception",
			"intimidation",
			"performance",
			"persuasion",
		].map((key) => ({ key, rank: "none" })),
	};
}
