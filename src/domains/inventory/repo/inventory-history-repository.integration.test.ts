import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { count, eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createInventoryHistoryRepository } from "./inventory-history-repository.js";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";

const createdUserIds: string[] = [];

afterEach(async () => {
	if (createdUserIds.length === 0) return;
	await getDb()
		.delete(userTable)
		.where(inArray(userTable.id, [...createdUserIds]));
	createdUserIds.length = 0;
});

afterAll(async () => closeDb());

describe("inventory history persistence", () => {
	it("appends, pages newest-first, and isolates history by scope", async () => {
		const first = await createScope();
		const second = await createScope();
		const repository = createInventoryHistoryRepository();
		const oldest = await repository.appendHistoryEntry(first.scopeId, {
			action: "item_added",
			entityType: "item",
			entityId: crypto.randomUUID(),
			entityName: "Rope",
			details: { quantity: 1 },
		});
		const middle = await repository.appendHistoryEntry(first.scopeId, {
			action: "item_updated",
			entityType: "item",
			entityId: oldest.entityId,
			entityName: "Rope",
			details: { quantity: 2 },
		});
		const newest = await repository.appendHistoryEntry(first.scopeId, {
			action: "item_removed",
			entityType: "item",
			entityId: oldest.entityId,
			entityName: "Rope",
			details: { quantity: 0 },
		});
		await repository.appendHistoryEntry(second.scopeId, {
			action: "currency_updated",
			entityType: "currency",
			details: { gp: 1 },
		});
		await setHistoryTimes(oldest.id, middle.id, newest.id);

		const firstPage = await repository.listHistoryEntries(first.scopeId, { limit: 2 });
		expect(firstPage).toMatchObject({ total: 3, limit: 2, offset: 0, hasMore: true });
		expect(firstPage.entries.map((entry) => entry.id)).toEqual([newest.id, middle.id]);
		const secondPage = await repository.listHistoryEntries(first.scopeId, { limit: 2, offset: 2 });
		expect(secondPage).toMatchObject({ total: 3, offset: 2, hasMore: false });
		expect(secondPage.entries[0]?.id).toBe(oldest.id);
		expect((await repository.listHistoryEntries(second.scopeId)).total).toBe(1);
	});

	it("cascades history when the inventory scope is deleted", async () => {
		const { scopeId } = await createScope();
		const repository = createInventoryHistoryRepository();
		await repository.appendHistoryEntry(scopeId, {
			action: "currency_updated",
			entityType: "currency",
			details: { gp: 2 },
		});
		await getDb().delete(inventoryScopesTable).where(eq(inventoryScopesTable.id, scopeId));
		expect(
			Number(
				(await getDb().select({ value: count() }).from(inventoryHistoryEntriesTable)).at(0)?.value,
			),
		).toBe(0);
	});
});

async function createScope() {
	const userId = crypto.randomUUID();
	const characterId = crypto.randomUUID();
	const scopeId = crypto.randomUUID();
	createdUserIds.push(userId);
	await getDb()
		.insert(userTable)
		.values({
			id: userId,
			name: "Inventory History Test User",
			email: `${userId}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	await getDb().execute(sql`
		INSERT INTO characters (id, user_id, name, class, level)
		VALUES (${characterId}, ${userId}, 'Inventory History Test Character', 'Fighter', 1)
	`);
	await getDb().insert(inventoryScopesTable).values({ id: scopeId, characterId });
	return { scopeId };
}

async function setHistoryTimes(oldestId: string, middleId: string, newestId: string) {
	await getDb().execute(sql`
		UPDATE inventory_history_entries
		SET created_at = CASE id
			WHEN ${oldestId} THEN TIMESTAMPTZ '2026-08-29 12:00:00+00'
			WHEN ${middleId} THEN TIMESTAMPTZ '2026-08-29 12:01:00+00'
			WHEN ${newestId} THEN TIMESTAMPTZ '2026-08-29 12:02:00+00'
		END
		WHERE id IN (${oldestId}, ${middleId}, ${newestId})
	`);
}
