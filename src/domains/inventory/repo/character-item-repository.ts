import { type DatabaseTransaction, getDb } from "@providers/database/index.js";
import { and, eq } from "drizzle-orm";
import {
	inventoryHistoryEntriesTable,
	inventoryItemsTable,
	inventoryScopesTable,
} from "../schema/index.js";
import type {
	InventoryHistoryActorUserId,
	InventoryItem,
	InventoryScopeId,
} from "../types/index.js";
import { InventoryItemIdSchema, InventoryItemSchema } from "../types/index.js";
import {
	type CharacterInventoryOwner,
	lockCharacterInventory,
	lockCharacterInventoryScope,
} from "./character-inventory-scope-repository.js";
import { toInventoryHistoryInsert } from "./inventory-history-mappers.js";
import {
	type InventoryItemUpdateInput,
	parseInventoryItemUpdate,
	toInventoryItem,
	toInventoryItemInsert,
} from "./inventory-item-mappers.js";
import type { InventoryItemRepository } from "./inventory-item-repository.js";
import { createInventoryItemRepository } from "./inventory-item-repository.js";

type ItemHistoryAction = "item_added" | "item_updated" | "item_removed";

export type InventoryItemHistoryWriter = (
	tx: DatabaseTransaction,
	scopeId: InventoryScopeId,
	action: ItemHistoryAction,
	item: InventoryItem,
	before?: InventoryItem,
	actorUserId?: InventoryHistoryActorUserId | null,
) => Promise<void>;

export interface CharacterItemRepository
	extends Pick<InventoryItemRepository, "findItem" | "listItems"> {
	createItemForCharacterWithHistory(
		owner: CharacterInventoryOwner,
		input: unknown,
	): Promise<InventoryItem>;
	updateItemWithHistory(
		owner: CharacterInventoryOwner,
		itemId: string,
		input: unknown,
	): Promise<InventoryItem | null>;
	deleteItemWithHistory(
		owner: CharacterInventoryOwner,
		itemId: string,
	): Promise<InventoryItem | null>;
	setEquippedWithHistory(
		owner: CharacterInventoryOwner,
		itemId: string,
		isEquipped: boolean,
	): Promise<InventoryItem | null>;
}

export interface CharacterItemRepositoryOptions {
	itemRepository?: InventoryItemRepository;
	historyWriter?: InventoryItemHistoryWriter;
}

export function createCharacterItemRepository(
	options: CharacterItemRepositoryOptions = {},
): CharacterItemRepository {
	const itemRepository = options.itemRepository ?? createInventoryItemRepository();
	const historyWriter = options.historyWriter ?? appendItemHistory;

	return {
		findItem: itemRepository.findItem,
		listItems: itemRepository.listItems,

		async createItemForCharacterWithHistory(owner, input) {
			return getDb().transaction(async (tx) => {
				const { characterId: parsedCharacterId, userId: parsedActorUserId } =
					await lockCharacterInventory(owner, tx);
				await tx
					.insert(inventoryScopesTable)
					.values({ characterId: parsedCharacterId })
					.onConflictDoNothing({ target: inventoryScopesTable.characterId });

				const [scope] = await tx
					.select({ id: inventoryScopesTable.id })
					.from(inventoryScopesTable)
					.where(eq(inventoryScopesTable.characterId, parsedCharacterId))
					.limit(1);
				if (!scope) throw new Error("Character inventory scope could not be ensured.");

				const [row] = await tx
					.insert(inventoryItemsTable)
					.values(toInventoryItemInsert(scope.id, input))
					.returning(itemColumns());
				if (!row) throw new Error("Inventory item could not be created.");
				const item = toInventoryItem(row);
				await historyWriter(tx, scope.id, "item_added", item, undefined, parsedActorUserId);
				return item;
			});
		},

		async updateItemWithHistory(owner, itemId, input) {
			const parsedItemId = InventoryItemIdSchema.parse(itemId);
			return getDb().transaction(async (tx) => {
				const parsedScopeId = await lockCharacterInventoryScope(owner, tx);
				if (!parsedScopeId) return null;
				const parsedActorUserId = owner.userId;
				const [currentRow] = await tx
					.select(itemColumns())
					.from(inventoryItemsTable)
					.where(
						and(
							eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
							eq(inventoryItemsTable.id, parsedItemId),
						),
					)
					.limit(1)
					.for("update");
				if (!currentRow) return null;

				const current = toInventoryItem(currentRow);
				const parsedUpdate = parseInventoryItemUpdate(input);
				InventoryItemSchema.parse({ ...current, ...parsedUpdate });
				if (!hasPersistedItemChanges(current, parsedUpdate)) return current;
				const [updatedRow] = await tx
					.update(inventoryItemsTable)
					.set({ ...parsedUpdate, updatedAt: new Date() })
					.where(
						and(
							eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
							eq(inventoryItemsTable.id, parsedItemId),
						),
					)
					.returning(itemColumns());
				if (!updatedRow) return null;

				const item = toInventoryItem(updatedRow);
				await historyWriter(tx, parsedScopeId, "item_updated", item, current, parsedActorUserId);
				return item;
			});
		},

		async deleteItemWithHistory(owner, itemId) {
			const parsedItemId = InventoryItemIdSchema.parse(itemId);
			return getDb().transaction(async (tx) => {
				const parsedScopeId = await lockCharacterInventoryScope(owner, tx);
				if (!parsedScopeId) return null;
				const parsedActorUserId = owner.userId;
				const [row] = await tx
					.delete(inventoryItemsTable)
					.where(
						and(
							eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
							eq(inventoryItemsTable.id, parsedItemId),
						),
					)
					.returning(itemColumns());
				if (!row) return null;

				const item = toInventoryItem(row);
				await historyWriter(tx, parsedScopeId, "item_removed", item, undefined, parsedActorUserId);
				return item;
			});
		},

		async setEquippedWithHistory(owner, itemId, isEquipped) {
			const parsedItemId = InventoryItemIdSchema.parse(itemId);
			return getDb().transaction(async (tx) => {
				const parsedScopeId = await lockCharacterInventoryScope(owner, tx);
				if (!parsedScopeId) return null;
				const parsedActorUserId = owner.userId;
				const [currentRow] = await tx
					.select(itemColumns())
					.from(inventoryItemsTable)
					.where(
						and(
							eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
							eq(inventoryItemsTable.id, parsedItemId),
						),
					)
					.limit(1)
					.for("update");
				if (!currentRow) return null;

				const current = toInventoryItem(currentRow);
				if (current.isEquipped === isEquipped) return current;

				const [updatedRow] = await tx
					.update(inventoryItemsTable)
					.set({ isEquipped, updatedAt: new Date() })
					.where(
						and(
							eq(inventoryItemsTable.inventoryScopeId, parsedScopeId),
							eq(inventoryItemsTable.id, parsedItemId),
						),
					)
					.returning(itemColumns());
				if (!updatedRow) return null;

				const item = toInventoryItem(updatedRow);
				await historyWriter(tx, parsedScopeId, "item_updated", item, current, parsedActorUserId);
				return item;
			});
		},
	};
}

async function appendItemHistory(
	tx: DatabaseTransaction,
	scopeId: InventoryScopeId,
	action: ItemHistoryAction,
	item: InventoryItem,
	before?: InventoryItem,
	actorUserId?: InventoryHistoryActorUserId | null,
) {
	const details = before
		? { before, after: item, item: null }
		: { before: null, after: null, item };
	const [row] = await tx
		.insert(inventoryHistoryEntriesTable)
		.values(
			toInventoryHistoryInsert(scopeId, {
				action,
				entityType: "item",
				entityId: item.id,
				entityName: item.name,
				actorUserId,
				details,
			}),
		)
		.returning({ id: inventoryHistoryEntriesTable.id });
	if (!row) throw new Error("Inventory item history could not be created.");
}

function hasPersistedItemChanges(current: InventoryItem, update: InventoryItemUpdateInput) {
	return Object.entries(update).some(([field, value]) => {
		const currentValue = current[field as keyof InventoryItem];
		return !areInventoryValuesEqual(currentValue, value);
	});
}

function areInventoryValuesEqual(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left) || Array.isArray(right)) {
		return (
			Array.isArray(left) &&
			Array.isArray(right) &&
			left.length === right.length &&
			left.every((value, index) => areInventoryValuesEqual(value, right[index]))
		);
	}
	if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
		return false;
	}

	const leftEntries = Object.entries(left);
	const rightRecord = right as Record<string, unknown>;
	return (
		leftEntries.length === Object.keys(rightRecord).length &&
		leftEntries.every(
			([key, value]) =>
				Object.hasOwn(rightRecord, key) && areInventoryValuesEqual(value, rightRecord[key]),
		)
	);
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
