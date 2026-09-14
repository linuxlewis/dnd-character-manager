import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../database/schema.js";

export type Database = PostgresJsDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DatabaseConnection = Database | DatabaseTransaction;

let client: postgres.Sql | null = null;
let db: Database | null = null;

export function getDatabaseUrl() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required for database access.");
	}
	return databaseUrl;
}

export function getDb() {
	if (!client) {
		client = postgres(getDatabaseUrl(), {
			max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
		});
		db = drizzle(client, { schema });
	}

	if (!db) {
		throw new Error("Database client failed to initialize.");
	}
	return db;
}

export async function closeDb() {
	if (client) {
		await client.end();
		client = null;
		db = null;
	}
}
