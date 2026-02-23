import { join } from "node:path";
import { migrate as drizzleMigrate } from "drizzle-orm/better-sqlite3/migrator";
import type { AppDatabase } from "./connection.js";

/**
 * Run all pending migrations from the drizzle/ folder.
 * Should be called before the server starts listening.
 */
export function migrate(db: AppDatabase, migrationsFolder?: string) {
	const folder = migrationsFolder ?? join(process.cwd(), "drizzle");
	drizzleMigrate(db, { migrationsFolder: folder });
}
