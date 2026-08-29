import { describe, expect, it, vi } from "vitest";
import type { CharacterService } from "../../characters/service/index.js";
import type {
	CharacterInventoryScopeRepository,
	InventoryHistoryRepository,
	InventoryItemRepository,
} from "../repo/index.js";
import type { InventoryItem } from "../types/index.js";
import { InventoryItemSchema } from "../types/index.js";
import type { CharacterItemCatalogueClient } from "./catalogue-item-client.js";
import { CharacterItemPersistenceError } from "./character-item-errors.js";
import { createCharacterItemService } from "./character-item-service.js";

const userId = "00000000-0000-4000-8000-000000000001";
const characterId = "00000000-0000-4000-8000-000000000002";
const scopeId = "00000000-0000-4000-8000-000000000004";
const catalogueItemId = "00000000-0000-4000-8000-000000000005";

describe("CharacterItemService mutations", () => {
	it("clears catalogue traceability on manual update", async () => {
		const fakes = makeFakes();
		const before = item({
			catalogueItemId,
			catalogueSourceKey: "old-key",
			catalogueRulesVersion: "2024",
		});
		const after = item({
			catalogueItemId: null,
			catalogueSourceKey: null,
			catalogueRulesVersion: null,
		});
		fakes.repository.findItem.mockResolvedValue(before);
		fakes.repository.updateItem.mockResolvedValue(after);
		const service = createCharacterItemService(fakes);

		await service.updateCharacterItem(userId, characterId, before.id, { catalogueItemId: null });
		expect(fakes.repository.updateItem).toHaveBeenCalledWith(scopeId, before.id, {
			catalogueItemId: null,
			catalogueSourceKey: null,
			catalogueRulesVersion: null,
		});
	});

	it("makes equip idempotent and scope constrained", async () => {
		const fakes = makeFakes();
		const equipped = item({ isEquipped: true });
		fakes.repository.findItem.mockResolvedValue(equipped);
		const service = createCharacterItemService(fakes);

		await expect(service.equipCharacterItem(userId, characterId, equipped.id)).resolves.toEqual({
			item: equipped,
		});
		expect(fakes.repository.updateItem).not.toHaveBeenCalled();

		const unequipped = item({ isEquipped: false });
		fakes.repository.findItem.mockResolvedValue(unequipped);
		fakes.repository.updateItem.mockResolvedValue(equipped);
		await service.equipCharacterItem(userId, characterId, unequipped.id);
		expect(fakes.repository.updateItem).toHaveBeenCalledWith(scopeId, unequipped.id, {
			isEquipped: true,
		});
	});

	it("records deletes and maps repository failures", async () => {
		const fakes = makeFakes();
		const removed = item();
		fakes.repository.deleteItem.mockResolvedValue(removed);
		const service = createCharacterItemService(fakes);

		await expect(
			service.deleteCharacterItem(userId, characterId, removed.id),
		).resolves.toBeUndefined();
		expect(fakes.historyRepository.appendHistoryEntry).toHaveBeenCalledWith(
			scopeId,
			expect.objectContaining({ action: "item_removed", entityId: removed.id }),
		);

		fakes.repository.findItem.mockRejectedValue(new Error("database offline"));
		await expect(service.getCharacterItem(userId, characterId, removed.id)).rejects.toBeInstanceOf(
			CharacterItemPersistenceError,
		);
	});
});

function makeFakes() {
	const repository = {
		createItem: vi.fn(),
		findItem: vi.fn(),
		updateItem: vi.fn(),
		deleteItem: vi.fn(),
		listItems: vi.fn(),
	} as unknown as InventoryItemRepository & {
		createItem: ReturnType<typeof vi.fn>;
		findItem: ReturnType<typeof vi.fn>;
		updateItem: ReturnType<typeof vi.fn>;
		deleteItem: ReturnType<typeof vi.fn>;
		listItems: ReturnType<typeof vi.fn>;
	};
	const historyRepository = {
		appendHistoryEntry: vi.fn(),
	} as unknown as InventoryHistoryRepository & {
		appendHistoryEntry: ReturnType<typeof vi.fn>;
	};
	const scopeRepository = {
		findCharacterScopeId: vi.fn().mockResolvedValue(scopeId),
		ensureCharacterScopeId: vi.fn().mockResolvedValue(scopeId),
	} as unknown as CharacterInventoryScopeRepository & {
		findCharacterScopeId: ReturnType<typeof vi.fn>;
		ensureCharacterScopeId: ReturnType<typeof vi.fn>;
	};
	const characterService = {
		getCharacter: vi.fn().mockResolvedValue({}),
	} as unknown as Pick<CharacterService, "getCharacter"> & {
		getCharacter: ReturnType<typeof vi.fn>;
	};
	const catalogueClient = {
		getItemDetails: vi.fn(),
	} as unknown as CharacterItemCatalogueClient & {
		getItemDetails: ReturnType<typeof vi.fn>;
	};
	return { repository, historyRepository, scopeRepository, characterService, catalogueClient };
}

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
	return InventoryItemSchema.parse({
		id: "00000000-0000-4000-8000-000000000006",
		inventoryScopeId: scopeId,
		name: "Longsword",
		type: "equipment",
		category: "Weapons",
		rarity: null,
		description: null,
		quantity: 1,
		weight: 3,
		estimatedValue: 15,
		notes: null,
		thumbnailUrl: null,
		properties: {},
		isEquipped: false,
		statModifiers: null,
		statOverrides: null,
		catalogueItemId: null,
		catalogueSourceKey: null,
		catalogueRulesVersion: null,
		createdAt: "2026-08-29T00:00:00.000Z",
		updatedAt: "2026-08-29T00:00:00.000Z",
		...overrides,
	});
}
