import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const SQLITE_MEMORY_PATH = ":memory:";
const APP_ROOT = resolve(import.meta.dirname, "../../..");

export function resolveDbPath(
	databaseUrl: string | undefined = process.env.DATABASE_URL,
	baseDir: string = APP_ROOT,
) {
	if (!databaseUrl) {
		return resolve(baseDir, "data", "app.db");
	}
	if (databaseUrl === SQLITE_MEMORY_PATH || isAbsolute(databaseUrl)) {
		return databaseUrl;
	}
	return resolve(baseDir, databaseUrl);
}

const DB_PATH = resolveDbPath();

/**
 * Create a database connection with better-sqlite3 and drizzle.
 * Ensures the data/ directory exists.
 */
export function createDb(dbPath: string = DB_PATH) {
	const resolvedDbPath = resolveDbPath(dbPath);
	if (resolvedDbPath !== SQLITE_MEMORY_PATH) {
		mkdirSync(dirname(resolvedDbPath), { recursive: true });
	}
	const sqlite = new Database(resolvedDbPath);
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

export { APP_ROOT, DB_PATH };
export type AppDatabase = ReturnType<typeof createDb>;
