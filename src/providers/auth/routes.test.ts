import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerAuthRoutes, toAuthRequest } from "./routes.js";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
	process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("toAuthRequest", () => {
	it("converts a Fastify request into a web Request", async () => {
		const app = Fastify();
		app.post("/probe", async (request) => {
			const authRequest = toAuthRequest(request);
			return {
				method: authRequest.method,
				url: authRequest.url,
				body: await authRequest.text(),
			};
		});

		try {
			const response = await app.inject({
				method: "POST",
				url: "/probe",
				headers: { host: "example.test" },
				payload: { ok: true },
			});

			expect(response.json()).toEqual({
				method: "POST",
				url: "http://example.test/probe",
				body: JSON.stringify({ ok: true }),
			});
		} finally {
			await app.close();
		}
	});
});

describe("registerAuthRoutes", () => {
	it("registers without initializing the Better Auth database adapter", async () => {
		delete process.env.DATABASE_URL;
		const app = Fastify();

		try {
			await expect(registerAuthRoutes(app)).resolves.toBeUndefined();
		} finally {
			await app.close();
		}
	});
});
