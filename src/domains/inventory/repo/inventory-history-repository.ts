import { getDb } from "@providers/database/index.js";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type {
	InventoryHistoryEntry,
	InventoryHistoryEntryInput,
	InventoryHistoryPage,
	InventoryHistoryPageRequest,
	InventoryScopeId,
} from "../types/index.js";
import {
	InventoryHistoryPageRequestSchema,
	InventoryHistoryPageSchema,
	InventoryScopeIdSchema,
	parseInventoryHistoryEntryInput,
} from "../types/index.js";
import { toInventoryHistoryEntry, toInventoryHistoryInsert } from "./inventory-history-mappers.js";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";

const CountRowSchema = z.object({ value: z.coerce.number().int().nonnegative() }).strict();

export interface InventoryHistoryRepository {
	appendHistoryEntry(
		scopeId: InventoryScopeId,
		input: InventoryHistoryEntryInput,
	): Promise<InventoryHistoryEntry>;
	listHistoryEntries(
		scopeId: InventoryScopeId,
		request?: Partial<InventoryHistoryPageRequest>,
	): Promise<InventoryHistoryPage>;
}

export function createInventoryHistoryRepository(): InventoryHistoryRepository {
	return {
		async appendHistoryEntry(scopeId, input) {
			const parsedInput = parseInventoryHistoryEntryInput(input);
			const [row] = await getDb()
				.insert(inventoryHistoryEntriesTable)
				.values(toInventoryHistoryInsert(scopeId, parsedInput))
				.returning(historyColumns());
			if (!row) throw new Error("Inventory history entry could not be created.");
			return toInventoryHistoryEntry(row);
		},

		async listHistoryEntries(scopeId, request = {}) {
			const parsedScopeId = InventoryScopeIdSchema.parse(scopeId);
			const page = InventoryHistoryPageRequestSchema.parse(request);
			const conditions = [eq(inventoryHistoryEntriesTable.inventoryScopeId, parsedScopeId)];
			if (page.action) conditions.push(eq(inventoryHistoryEntriesTable.action, page.action));
			if (page.entityType)
				conditions.push(eq(inventoryHistoryEntriesTable.entityType, page.entityType));
			const where = and(...conditions);
			const [rows, totalRows] = await Promise.all([
				getDb()
					.select(historyColumns())
					.from(inventoryHistoryEntriesTable)
					.where(where)
					.orderBy(
						desc(inventoryHistoryEntriesTable.createdAt),
						desc(inventoryHistoryEntriesTable.id),
					)
					.limit(page.limit)
					.offset(page.offset),
				getDb().select({ value: count() }).from(inventoryHistoryEntriesTable).where(where),
			]);
			const total = CountRowSchema.parse(totalRows[0] ?? { value: 0 }).value;
			return InventoryHistoryPageSchema.parse({
				entries: rows.map(toInventoryHistoryEntry),
				total,
				limit: page.limit,
				offset: page.offset,
				hasMore: page.offset + rows.length < total,
			});
		},
	};
}

function historyColumns() {
	return {
		id: inventoryHistoryEntriesTable.id,
		inventoryScopeId: inventoryHistoryEntriesTable.inventoryScopeId,
		action: inventoryHistoryEntriesTable.action,
		entityType: inventoryHistoryEntriesTable.entityType,
		entityId: inventoryHistoryEntriesTable.entityId,
		entityName: inventoryHistoryEntriesTable.entityName,
		actorUserId: inventoryHistoryEntriesTable.actorUserId,
		details: inventoryHistoryEntriesTable.details,
		createdAt: inventoryHistoryEntriesTable.createdAt,
	};
}
