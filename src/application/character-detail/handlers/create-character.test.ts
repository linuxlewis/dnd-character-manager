import Fastify from "fastify";
import { expect, it, vi } from "vitest";

import type { CharacterDetail } from "../types/index.js";
import { registerCharacterCreationRoute } from "./create-character.js";

it("returns the creation result and associates the current session owner", async () => {
	const app = Fastify();
	const userId = crypto.randomUUID();
	const character = { id: crypto.randomUUID() } as CharacterDetail;
	const create = vi.fn().mockResolvedValue(character);
	await registerCharacterCreationRoute(app, {
		create,
		getCurrentUser: async () => ({ user: { id: userId, name: "Anonymous", isAnonymous: true } }),
	});
	try {
		const body = { name: " Nyx ", className: "Warlock", level: 6, maxHp: 28 };
		const response = await app.inject({ method: "POST", url: "/api/characters", payload: body });
		expect(response.statusCode).toBe(201);
		expect(response.json()).toEqual({ character });
		expect(create).toHaveBeenCalledExactlyOnceWith({ ...body, userId });
	} finally {
		await app.close();
	}
});

it("rejects invalid creation before establishing a session or running the workflow", async () => {
	const app = Fastify();
	const create = vi.fn();
	const getCurrentUser = vi.fn();
	await registerCharacterCreationRoute(app, { create, getCurrentUser });
	try {
		const response = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: { name: "", maxHp: 0 },
		});
		expect(response.statusCode).toBe(400);
		expect(response.json()).toEqual({ error: "Invalid request body." });
		expect(create).not.toHaveBeenCalled();
		expect(getCurrentUser).not.toHaveBeenCalled();
	} finally {
		await app.close();
	}
});
