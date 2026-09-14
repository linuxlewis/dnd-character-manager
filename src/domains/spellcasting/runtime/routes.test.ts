import Fastify from "fastify";
import { expect, it, vi } from "vitest";
import { registerSpellcastingRoutes } from "./routes.js";

it("rejects malformed slot paths before creating a session", async () => {
	const app = Fastify();
	const getCurrentUser = vi.fn();
	await registerSpellcastingRoutes(app, { getCurrentUser });
	try {
		const result = await app.inject({
			method: "POST",
			url: "/api/characters/not-a-uuid/spell-slots/use",
			payload: { level: 1 },
		});
		expect(result.statusCode).toBe(400);
		expect(getCurrentUser).not.toHaveBeenCalled();
	} finally {
		await app.close();
	}
});
