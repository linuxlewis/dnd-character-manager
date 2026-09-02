import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { count, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createInventoryHistoryRepository } from "./inventory-history-repository.js";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
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
		const itemId = crypto.randomUUID();
		const oldest = await repository.appendHistoryEntry(first.scopeId, {
			action: "item_added",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			details: { version: 1, item: historyItem(itemId, 1) },
		});
		const middle = await repository.appendHistoryEntry(first.scopeId, {
			action: "item_updated",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			details: {
				version: 1,
				before: historyItem(itemId, 1),
				after: historyItem(itemId, 2),
				changedFields: ["quantity"],
			},
		});
		const newest = await repository.appendHistoryEntry(first.scopeId, {
			action: "item_removed",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			details: { version: 1, item: historyItem(itemId, 2) },
		});
		await repository.appendHistoryEntry(second.scopeId, {
			action: "currency_updated",
			entityType: "currency",
			details: currencyDetails(1),
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
			details: currencyDetails(2),
		});
		await getDb().delete(inventoryScopesTable).where(eq(inventoryScopesTable.id, scopeId));
		const [remaining] = await getDb()
			.select({ value: count() })
			.from(inventoryHistoryEntriesTable)
			.where(eq(inventoryHistoryEntriesTable.inventoryScopeId, scopeId));
		expect(Number(remaining?.value ?? 0)).toBe(0);
	});

	it("filters by action and entity type without crossing scopes", async () => {
		const first = await createScope();
		const second = await createScope();
		const repository = createInventoryHistoryRepository();
		const itemId = crypto.randomUUID();
		await repository.appendHistoryEntry(first.scopeId, {
			action: "item_added",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			details: { version: 1, item: historyItem(itemId) },
		});
		await repository.appendHistoryEntry(first.scopeId, {
			action: "currency_updated",
			entityType: "currency",
			details: currencyDetails(1),
		});
		await repository.appendHistoryEntry(second.scopeId, {
			action: "item_added",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			details: { version: 1, item: historyItem(itemId) },
		});

		const itemPage = await repository.listHistoryEntries(first.scopeId, {
			action: "item_added",
			entityType: "item",
		});
		expect(itemPage).toMatchObject({ total: 1, limit: 20, offset: 0, hasMore: false });
		expect(itemPage.entries[0]?.inventoryScopeId).toBe(first.scopeId);
		const currencyPage = await repository.listHistoryEntries(first.scopeId, {
			entityType: "currency",
		});
		expect(currencyPage).toMatchObject({ total: 1, hasMore: false });
		expect(currencyPage.entries[0]?.entityType).toBe("currency");
	});

	it("lists legacy currency changes rows without rejecting the page", async () => {
		const { scopeId } = await createScope();
		const legacyId = crypto.randomUUID();
		const legacyNote = "n".repeat(501);
		await getDb()
			.insert(inventoryHistoryEntriesTable)
			.values({
				id: legacyId,
				inventoryScopeId: scopeId,
				action: "currency_updated",
				entityType: "currency",
				entityId: null,
				entityName: null,
				details: {
					changes: {
						old: { cp: 0, sp: 0, gp: 1, pp: 0 },
						new: { cp: 0, sp: 0, gp: 2, pp: 0 },
					},
					note: legacyNote,
				},
			});

		const page = await createInventoryHistoryRepository().listHistoryEntries(scopeId);
		expect(page).toMatchObject({ total: 1, limit: 20, offset: 0, hasMore: false });
		expect(page.entries[0]).toMatchObject({
			id: legacyId,
			details: {
				changes: {
					old: { gp: 1 },
					new: { gp: 2 },
				},
				note: "n".repeat(500),
			},
		});
	});

	it("orders tied timestamps by descending history id and preserves actor rows", async () => {
		const { scopeId } = await createScope();
		const actorUserId = crypto.randomUUID();
		createdUserIds.push(actorUserId);
		await getDb()
			.insert(userTable)
			.values({
				id: actorUserId,
				name: "Inventory History Actor",
				email: `${actorUserId}@example.test`,
				emailVerified: false,
				isAnonymous: true,
			});
		const repository = createInventoryHistoryRepository();
		try {
			const first = await repository.appendHistoryEntry(scopeId, {
				action: "currency_updated",
				entityType: "currency",
				actorUserId,
				details: currencyDetails(1),
			});
			const second = await repository.appendHistoryEntry(scopeId, {
				action: "currency_updated",
				entityType: "currency",
				actorUserId,
				details: currencyDetails(2),
			});
			await getDb().execute(sql`
				UPDATE inventory_history_entries
				SET created_at = TIMESTAMPTZ '2026-08-29 12:00:00+00'
				WHERE id IN (${first.id}, ${second.id})
			`);

			const page = await repository.listHistoryEntries(scopeId, { limit: 1 });
			expect(page.entries[0]?.id).toBe(second.id > first.id ? second.id : first.id);
			expect(page.entries[0]?.actorUserId).toBe(actorUserId);
			await getDb().delete(userTable).where(eq(userTable.id, actorUserId));
			const afterActorDelete = await repository.listHistoryEntries(scopeId);
			expect(afterActorDelete.entries.every((entry) => entry.actorUserId === null)).toBe(true);
		} finally {
			await getDb().delete(userTable).where(eq(userTable.id, actorUserId));
		}
	});
});

function historyItem(id: string, quantity = 1) {
	return {
		id,
		name: "Rope",
		type: "misc" as const,
		category: "Adventuring Gear",
		rarity: null,
		quantity,
		weight: 10,
		estimatedValue: 1,
		isEquipped: false,
	};
}

function currencyDetails(gold: number) {
	return {
		version: 1 as const,
		operation: "add" as const,
		previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
		next: { cp: 0, sp: 0, gp: gold, pp: 0 },
		delta: { cp: 0, sp: 0, gp: gold, pp: 0 },
		requested: { delta: { cp: 0, sp: 0, gp: gold, pp: 0 } },
		note: null,
	};
}

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
