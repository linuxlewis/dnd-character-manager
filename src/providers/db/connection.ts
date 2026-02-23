import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const DB_PATH = join(process.cwd(), "data", "app.db");

/**
 * Create a database connection with better-sqlite3 and drizzle.
 * Ensures the data/ directory exists.
 */
export function createDb(dbPath: string = DB_PATH) {
	mkdirSync(join(dbPath, ".."), { recursive: true });
	const sqlite = new Database(dbPath);
	sqlite.pragma("journal_mode = WAL");
	return drizzle(sqlite, { schema });
}

/** Singleton database instance for the app */
let _db: ReturnType<typeof createDb> | null = null;

export function getDb(): ReturnType<typeof createDb> {
	if (!_db) {
		_db = createDb();
	}
	return _db;
}

/** Override the singleton — used by tests to inject an in-memory DB. */
export function _setDb(db: ReturnType<typeof createDb>) {
	_db = db;
}

export { DB_PATH };
export type AppDatabase = ReturnType<typeof createDb>;
