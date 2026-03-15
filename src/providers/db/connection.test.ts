import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { APP_ROOT, createDb, resolveDbPath } from "./connection.js";
import { migrate } from "./migrate.js";
import { characters } from "./schema.js";

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

	it("resolves the default database path from the repository root", () => {
		const resolvedPath = resolveDbPath(undefined);
		expect(resolvedPath).toBe(join(APP_ROOT, "data", "app.db"));
		expect(isAbsolute(resolvedPath)).toBe(true);
	});

	it("resolves relative database paths from the repository root", () => {
		expect(resolveDbPath("var/app.db")).toBe(join(APP_ROOT, "var", "app.db"));
	});

	it("preserves absolute database paths and sqlite memory paths", () => {
		expect(resolveDbPath("/srv/app.db", "/tmp/project")).toBe("/srv/app.db");
		expect(resolveDbPath(":memory:", "/tmp/project")).toBe(":memory:");
	});

	it("creates parent directories for nested database paths", () => {
		const dir = mkdtempSync(join(tmpdir(), "db-test-"));
		tempDirs.push(dir);
		const dbPath = join(dir, "nested", "db", "app.db");

		createDb(dbPath);

		expect(existsSync(join(dir, "nested", "db"))).toBe(true);
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

		db.insert(characters)
			.values({
				id: "test-1",
				name: "Gandalf",
				race: "Human",
				class: "Wizard",
				level: 20,
				ability_scores: { str: 10, dex: 14, con: 12, int: 20, wis: 18, cha: 16 },
				hp: { current: 80, max: 80, temporary: 0 },
				equipment: [],
				skills: [],
			})
			.run();

		const result = db.select().from(characters).all();
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Gandalf");
	});
});
