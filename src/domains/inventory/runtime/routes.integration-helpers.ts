import { resetAuthForTest } from "@providers/auth/auth.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { count, eq, sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import { z } from "zod";
import type { buildServer } from "../../../app-server.js";
import { inventoryScopesTable } from "../repo/inventory-scope-table.js";
import { inventoryTreasuriesTable } from "../repo/inventory-treasury-table.js";

const CountRowSchema = z.object({ count: z.coerce.number().int().nonnegative() }).strict();

export async function resetInventoryRouteDatabase() {
	resetAuthForTest();
	await getDb().execute(sql`
		TRUNCATE TABLE
			"verification",
			account,
			"session",
			"user",
			inventory_treasuries,
			inventory_scopes,
			characters
		CASCADE
	`);
}

export async function closeInventoryRouteDatabase() {
	resetAuthForTest();
	await closeDb();
}

export async function createSessionCookie(app: Awaited<ReturnType<typeof buildServer>>) {
	const response = await app.inject({ method: "GET", url: "/api/current-user" });
	if (response.statusCode !== 200) throw new Error(`Session setup failed: ${response.body}`);
	return toCookieHeader(response.headers["set-cookie"]);
}

export async function scopeRowCount(characterId: string) {
	const [row] = await getDb()
		.select({ count: count() })
		.from(inventoryScopesTable)
		.where(eq(inventoryScopesTable.characterId, characterId));
	return CountRowSchema.parse(row ?? { count: 0 }).count;
}

export async function treasuryRowCount(characterId: string) {
	const [row] = await getDb()
		.select({ count: count() })
		.from(inventoryTreasuriesTable)
		.innerJoin(
			inventoryScopesTable,
			eq(inventoryTreasuriesTable.inventoryScopeId, inventoryScopesTable.id),
		)
		.where(eq(inventoryScopesTable.characterId, characterId));
	return CountRowSchema.parse(row ?? { count: 0 }).count;
}

export function toCookieHeader(setCookie: string | string[] | undefined) {
	const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
	return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

export function registerInventoryRouteLifecycle() {
	beforeEach(resetInventoryRouteDatabase);
	afterAll(closeInventoryRouteDatabase);
}
