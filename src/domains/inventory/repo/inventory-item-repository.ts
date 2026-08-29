import { getDb } from "@providers/database/index.js";
import { and, asc, count, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import type { InventoryItem, InventoryItemFilter, InventoryScopeId } from "../types/index.js";
import {
	InventoryItemFilterSchema,
	InventoryItemIdSchema,
	InventoryItemSchema,
	InventoryScopeIdSchema,
} from "../types/index.js";
import {
	parseInventoryItemUpdate,
	toInventoryItem,
	toInventoryItemInsert,
} from "./inventory-item-mappers.js";
import { inventoryItemsTable } from "./inventory-item-table.js";

const CountRowSchema = z.object({ value: z.coerce.number().int().nonnegative() }).strict();

export interface InventoryItemList {
	items: InventoryItem[];
	total: number;
}

export interface InventoryItemRepository {
	createItem(scopeId: InventoryScopeId, input: unknown): Promise<InventoryItem>;
	findItem(scopeId: InventoryScopeId, itemId: string): Promise<InventoryItem | null>;
	updateItem(
		scopeId: InventoryScopeId,
		itemId: string,
		input: unknown,
	): Promise<InventoryItem | null>;
	deleteItem(scopeId: InventoryScopeId, itemId: string): Promise<InventoryItem | null>;
	listItems(scopeId: InventoryScopeId, filter?: InventoryItemFilter): Promise<InventoryItemList>;
}

export function createInventoryItemRepository(): InventoryItemRepository {
	return {
		async createItem(scopeId, input) {
			const [row] = await getDb()
				.insert(inventoryItemsTable)
				.values(toInventoryItemInsert(scopeId, input))
				.returning(itemColumns());
			if (!row) throw new Error("Inventory item could not be created.");
			return toInventoryItem(row);
		},

		async findItem(scopeId, itemId) {
			const row = await findItemRow(scopeId, itemId);
			return row ? toInventoryItem(row) : null;
		},

		async updateItem(scopeId, itemId, input) {
			const parsedScopeId = InventoryScopeIdSchema.parse(scopeId);
			const parsedItemId = InventoryItemIdSchema.parse(itemId);
			const [currentRow] = await getDb()
				.select(itemColumns())
				.from(inventoryItemsTable)
				.where(
					and(
						eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
						eq(inventoryItemsTable.id, parsedItemId),
					),
				)
				.limit(1);
			if (!currentRow) return null;

			const current = toInventoryItem(currentRow);
			const parsedUpdate = parseInventoryItemUpdate(input);
			InventoryItemSchema.parse({ ...current, ...parsedUpdate });
			const [updatedRow] = await getDb()
				.update(inventoryItemsTable)
				.set({ ...parsedUpdate, updatedAt: new Date() })
				.where(
					and(
						eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
						eq(inventoryItemsTable.id, parsedItemId),
					),
				)
				.returning(itemColumns());
			return updatedRow ? toInventoryItem(updatedRow) : null;
		},

		async deleteItem(scopeId, itemId) {
			const parsedScopeId = InventoryScopeIdSchema.parse(scopeId);
			const parsedItemId = InventoryItemIdSchema.parse(itemId);
			const [row] = await getDb()
				.delete(inventoryItemsTable)
				.where(
					and(
						eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
						eq(inventoryItemsTable.id, parsedItemId),
					),
				)
				.returning(itemColumns());
			return row ? toInventoryItem(row) : null;
		},

		async listItems(scopeId, filter = {}) {
			const parsedScopeId = InventoryScopeIdSchema.parse(scopeId);
			const parsedFilter = InventoryItemFilterSchema.parse(filter);
			const where = itemWhere(parsedScopeId, parsedFilter);
			const [rows, totalRows] = await Promise.all([
				getDb()
					.select(itemColumns())
					.from(inventoryItemsTable)
					.where(where)
					.orderBy(
						asc(inventoryItemsTable.name),
						asc(inventoryItemsTable.createdAt),
						asc(inventoryItemsTable.id),
					),
				getDb().select({ value: count() }).from(inventoryItemsTable).where(where),
			]);
			const total = CountRowSchema.parse(totalRows[0] ?? { value: 0 }).value;
			return {
				items: rows.map(toInventoryItem),
				total,
			};
		},
	};
}

async function findItemRow(scopeId: string, itemId: string) {
	const parsedScopeId = InventoryScopeIdSchema.parse(scopeId);
	const parsedItemId = InventoryItemIdSchema.parse(itemId);
	const [row] = await getDb()
		.select(itemColumns())
		.from(inventoryItemsTable)
		.where(
			and(
				eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
				eq(inventoryItemsTable.id, parsedItemId),
			),
		)
		.limit(1);
	return row;
}

function itemWhere(scopeId: string, filter: InventoryItemFilter) {
	const conditions = [eq(inventoryItemsTable.inventoryScopeId, scopeId)];
	if (filter.search)
		conditions.push(ilike(inventoryItemsTable.name, `%${escapeLike(filter.search)}%`));
	if (filter.type) conditions.push(eq(inventoryItemsTable.type, filter.type));
	if (filter.rarity) conditions.push(eq(inventoryItemsTable.rarity, filter.rarity));
	if (filter.category) conditions.push(ilike(inventoryItemsTable.category, filter.category));
	if (filter.isEquipped !== undefined) {
		conditions.push(eq(inventoryItemsTable.isEquipped, filter.isEquipped));
	}
	if (filter.catalogueItemId) {
		conditions.push(eq(inventoryItemsTable.catalogueItemId, filter.catalogueItemId));
	}
	return and(...conditions);
}

function escapeLike(value: string) {
	return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function itemColumns() {
	return {
		id: inventoryItemsTable.id,
		inventoryScopeId: inventoryItemsTable.inventoryScopeId,
		name: inventoryItemsTable.name,
		type: inventoryItemsTable.type,
		category: inventoryItemsTable.category,
		rarity: inventoryItemsTable.rarity,
		description: inventoryItemsTable.description,
		quantity: inventoryItemsTable.quantity,
		weight: inventoryItemsTable.weight,
		estimatedValue: inventoryItemsTable.estimatedValue,
		notes: inventoryItemsTable.notes,
		thumbnailUrl: inventoryItemsTable.thumbnailUrl,
		catalogueItemId: inventoryItemsTable.catalogueItemId,
		catalogueSourceKey: inventoryItemsTable.catalogueSourceKey,
		catalogueRulesVersion: inventoryItemsTable.catalogueRulesVersion,
		properties: inventoryItemsTable.properties,
		isEquipped: inventoryItemsTable.isEquipped,
		statModifiers: inventoryItemsTable.statModifiers,
		statOverrides: inventoryItemsTable.statOverrides,
		createdAt: inventoryItemsTable.createdAt,
		updatedAt: inventoryItemsTable.updatedAt,
	};
}
