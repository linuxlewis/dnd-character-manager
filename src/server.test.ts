import Fastify from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("server health check", () => {
	const app = Fastify();

	beforeAll(async () => {
		app.get("/health", async () => ({ status: "ok" }));
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
});
