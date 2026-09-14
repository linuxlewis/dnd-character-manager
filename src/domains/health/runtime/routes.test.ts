import Fastify from "fastify";
import { expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import { registerHealthRoutes } from "./routes.js";

it.each([
	["not-an-id", { currentHp: 1, maxHp: 20, temporaryHp: 0 }, "Invalid character path."],
	[
		"00000000-0000-4000-8000-000000000001",
		{ currentHp: -1, maxHp: 20, temporaryHp: 0 },
		"Invalid request body.",
	],
])("validates health %s before creating a session", async (id, payload, error) => {
	const app = Fastify();
	const getCurrentUser = vi.fn();
	const updateCharacterHealth = vi.fn();
	await registerHealthRoutes(app, {
		getCurrentUser,
		characterHealthService: { updateCharacterHealth },
	});
	try {
		const result = await app.inject({
			method: "PUT",
			url: `/api/characters/${id}/health`,
			payload,
		});
		expect(result.statusCode).toBe(400);
		expect(result.json()).toEqual({ error });
		expect(getCurrentUser).not.toHaveBeenCalled();
		expect(updateCharacterHealth).not.toHaveBeenCalled();
	} finally {
		await app.close();
	}
});
it("preserves the missing owned-health 404 envelope", async () => {
	const app = Fastify();
	await registerHealthRoutes(app, {
		getCurrentUser: async () => ({ user: { id: "owner", name: "Owner", isAnonymous: true } }),
		characterHealthService: {
			updateCharacterHealth: async () => {
				throw new CharacterNotFoundError();
			},
		},
	});
	try {
		const result = await app.inject({
			method: "PUT",
			url: "/api/characters/00000000-0000-4000-8000-000000000001/health",
			payload: { currentHp: 1, maxHp: 20, temporaryHp: 0 },
		});
		expect(result.statusCode).toBe(404);
		expect(result.json()).toEqual({ error: "Character not found." });
	} finally {
		await app.close();
	}
});
