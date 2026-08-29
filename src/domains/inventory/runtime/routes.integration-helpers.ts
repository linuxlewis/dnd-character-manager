import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable } from "@providers/auth/schema.js";
import { getDb } from "@providers/database/index.js";
import { count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { buildServer } from "../../../app-server.js";
import { charactersTable } from "../../characters/repo/character-table.js";
import { inventoryScopesTable } from "../repo/inventory-scope-table.js";
import { inventoryTreasuriesTable } from "../repo/inventory-treasury-table.js";

const CountRowSchema = z.object({ count: z.coerce.number().int().nonnegative() }).strict();
const createdUserIds: string[] = [];

export async function resetInventoryRouteDatabase() {
	resetAuthForTest();
	await deleteCreatedUsers();
}

export async function cleanupInventoryRouteDatabase() {
	resetAuthForTest();
	await deleteCreatedUsers();
}

export async function createSessionCookie(app: Awaited<ReturnType<typeof buildServer>>) {
	const response = await app.inject({ method: "GET", url: "/api/current-user" });
	if (response.statusCode !== 200) throw new Error(`Session setup failed: ${response.body}`);
	createdUserIds.push(response.json().user.id);
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

async function deleteCreatedUsers() {
	if (createdUserIds.length === 0) return;
	const userIds = [...createdUserIds];
	const characters = await getDb()
		.select({ id: charactersTable.id })
		.from(charactersTable)
		.where(inArray(charactersTable.userId, userIds));
	const characterIds = characters.map((character) => character.id);
	if (characterIds.length > 0) {
		const scopes = await getDb()
			.select({ id: inventoryScopesTable.id })
			.from(inventoryScopesTable)
			.where(inArray(inventoryScopesTable.characterId, characterIds));
		const scopeIds = scopes.map((scope) => scope.id);
		if (scopeIds.length > 0) {
			await getDb()
				.delete(inventoryTreasuriesTable)
				.where(inArray(inventoryTreasuriesTable.inventoryScopeId, scopeIds));
		}
		await getDb()
			.delete(inventoryScopesTable)
			.where(inArray(inventoryScopesTable.characterId, characterIds));
	}
	await getDb().delete(userTable).where(inArray(userTable.id, userIds));
	createdUserIds.length = 0;
}
