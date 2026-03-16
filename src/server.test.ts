import Fastify from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("server health check", () => {
	const app = Fastify();

	beforeAll(async () => {
		app.get("/health", async () => ({ status: "ok" }));
		app.get("/api/debug/persistence", async () => ({
			databasePath: "/app/data/app.db",
			nodeEnv: "test",
		}));
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it("GET /health returns 200 with status ok", async () => {
		const res = await app.inject({ method: "GET", url: "/health" });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ status: "ok" });
	});

	it("GET /api/debug/persistence returns the resolved database path", async () => {
		const res = await app.inject({ method: "GET", url: "/api/debug/persistence" });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({
			databasePath: "/app/data/app.db",
			nodeEnv: "test",
		});
	});
});
