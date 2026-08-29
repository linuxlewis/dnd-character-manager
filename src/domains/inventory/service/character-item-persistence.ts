import type { InventoryHistoryRepository } from "../repo/index.js";
import type { InventoryItem } from "../types/index.js";
import { CharacterItemPersistenceError } from "./character-item-errors.js";

export async function recordHistory(
	historyRepository: InventoryHistoryRepository | undefined,
	scopeId: string,
	action: "item_added" | "item_updated" | "item_removed",
	item: InventoryItem,
	before?: InventoryItem,
) {
	if (!historyRepository) return;
	const details = before
		? { before, after: item, item: null }
		: { before: null, after: null, item };
	await repositoryCall("history", () =>
		historyRepository.appendHistoryEntry(scopeId, {
			action,
			entityType: "item",
			entityId: item.id,
			entityName: item.name,
			details,
		}),
	);
}

export async function repositoryCall<T>(operation: string, callback: () => Promise<T>): Promise<T> {
	try {
		return await callback();
	} catch (error) {
		if (error instanceof CharacterItemPersistenceError) throw error;
		throw new CharacterItemPersistenceError(`Character item ${operation} failed.`, error);
	}
}
