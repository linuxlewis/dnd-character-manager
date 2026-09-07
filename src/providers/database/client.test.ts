import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDb, getDatabaseUrl } from "./client.js";

const originalDatabaseUrl = process.env.DATABASE_URL;

describe("getDatabaseUrl", () => {
	afterEach(async () => {
		if (originalDatabaseUrl === undefined) {
			process.env.DATABASE_URL = "";
		} else {
			process.env.DATABASE_URL = originalDatabaseUrl;
		}
		await closeDb();
	});

	it("requires DATABASE_URL", () => {
		process.env.DATABASE_URL = "";
		expect(() => getDatabaseUrl()).toThrow("DATABASE_URL is required");
	});

	it("imports without initializing the database", async () => {
		process.env.DATABASE_URL = "";
		vi.resetModules();
		const database = await import("./client.js");
		expect(() => database.getDb()).toThrow("DATABASE_URL is required");
		await database.closeDb();
	});

	it("returns DATABASE_URL when configured", () => {
		process.env.DATABASE_URL = "postgres://app:localdev@127.0.0.1:5432/app";
		expect(getDatabaseUrl()).toBe("postgres://app:localdev@127.0.0.1:5432/app");
	});
});
