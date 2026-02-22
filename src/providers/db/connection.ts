import { drizzle } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";
import * as schema from "./schema.js";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const DB_PATH = join(process.cwd(), "data", "app.db");

/**
 * Create a database connection. Requires better-sqlite3 to be installed.
 * This will be used when the server boots.
 */
export function createDb(sqlite: unknown) {
	mkdirSync(join(process.cwd(), "data"), { recursive: true });
	return drizzle(sqlite as InstanceType<typeof Database>, { schema });
}

export { DB_PATH };
export type AppDatabase = ReturnType<typeof createDb>;
