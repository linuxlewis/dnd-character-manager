import { afterEach, describe, expect, it } from "vitest";
import { getAuthBaseUrl, getAuthSecret, getTrustedOrigins } from "./auth.js";

const originalEnv = { ...process.env };

describe("auth configuration helpers", () => {
	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("requires an explicit secret in production", () => {
		delete process.env.BETTER_AUTH_SECRET;
		process.env.NODE_ENV = "production";

		expect(() => getAuthSecret()).toThrow("BETTER_AUTH_SECRET is required in production.");
	});

	it("uses a local development secret outside production", () => {
		delete process.env.BETTER_AUTH_SECRET;
		process.env.NODE_ENV = "test";

		expect(getAuthSecret().length).toBeGreaterThanOrEqual(32);
	});

	it("builds a default base URL from host and port", () => {
		delete process.env.BETTER_AUTH_URL;
		process.env.HOST = "127.0.0.1";
		process.env.PORT = "4010";

		expect(getAuthBaseUrl()).toBe("http://127.0.0.1:4010");
	});

	it("parses trusted origins from a comma-separated environment value", () => {
		process.env.BETTER_AUTH_TRUSTED_ORIGINS = "http://localhost:3000, https://app.example.com ";

		expect(getTrustedOrigins()).toEqual(["http://localhost:3000", "https://app.example.com"]);
	});
});
