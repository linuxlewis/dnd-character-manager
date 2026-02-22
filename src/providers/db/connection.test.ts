import { describe, it, expect, afterEach } from "vitest";
import { createDb } from "./connection.js";
import { migrate } from "./migrate.js";
import { characters } from "./schema.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("database connection", () => {
	const tempDirs: string[] = [];

	function makeTempDb() {
		const dir = mkdtempSync(join(tmpdir(), "db-test-"));
		tempDirs.push(dir);
		const dbPath = join(dir, "test.db");
		return { dir, dbPath };
	}

	afterEach(() => {
		for (const dir of tempDirs) {
			rmSync(dir, { recursive: true, force: true });
		}
		tempDirs.length = 0;
	});

	it("creates a drizzle database instance", () => {
		const { dbPath } = makeTempDb();
		const db = createDb(dbPath);
		expect(db).toBeDefined();
		expect(typeof db.select).toBe("function");
	});

	it("can run migrations without error", () => {
		const { dbPath } = makeTempDb();
		const db = createDb(dbPath);
		const migrationsFolder = join(process.cwd(), "drizzle");
		expect(() => migrate(db, migrationsFolder)).not.toThrow();
	});

	it("can insert and query after migration", () => {
		const { dbPath } = makeTempDb();
		const db = createDb(dbPath);
		migrate(db, join(process.cwd(), "drizzle"));

		db.insert(characters).values({
			id: "test-1",
			name: "Gandalf",
			race: "Human",
			class: "Wizard",
			level: 20,
			ability_scores: { str: 10, dex: 14, con: 12, int: 20, wis: 18, cha: 16 },
			hp: { current: 80, max: 80, temporary: 0 },
			equipment: [],
			skills: [],
		}).run();

		const result = db.select().from(characters).all();
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Gandalf");
	});
});
