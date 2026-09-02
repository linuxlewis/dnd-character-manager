import { describe, expect, it, vi } from "vitest";
import type { CharacterService } from "../../characters/service/index.js";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import type { CharacterInventoryScopeRepository, CharacterItemRepository } from "../repo/index.js";
import type { InventoryItem } from "../types/index.js";
import { InventoryItemSchema } from "../types/index.js";
import type {
	CatalogueItemSnapshot,
	CharacterItemCatalogueClient,
} from "./catalogue-item-client.js";
import {
	CatalogueItemClientUnavailableError,
	CatalogueItemNotFoundError,
	CatalogueItemUnavailableError,
	CharacterItemNotFoundError,
} from "./character-item-errors.js";
import { createCharacterItemService } from "./character-item-service.js";

const userId = "00000000-0000-4000-8000-000000000001";
const characterId = "00000000-0000-4000-8000-000000000002";
const otherCharacterId = "00000000-0000-4000-8000-000000000003";
const scopeId = "00000000-0000-4000-8000-000000000004";
const catalogueItemId = "00000000-0000-4000-8000-000000000005";

describe("CharacterItemService", () => {
	it("creates manual items only after authorizing the character", async () => {
		const fakes = makeFakes();
		const savedItem = item();
		fakes.repository.createItemForCharacterWithHistory.mockResolvedValue(savedItem);
		const service = createCharacterItemService(fakes);

		await expect(
			service.createCharacterItem(userId, characterId, {
				name: "Rope",
				type: "misc",
				category: "Adventuring Gear",
				quantity: 2,
				properties: {},
			}),
		).resolves.toEqual({ item: savedItem });
		expect(fakes.characterService.getCharacter).toHaveBeenCalledWith(userId, characterId);
		expect(fakes.repository.createItemForCharacterWithHistory).toHaveBeenCalledWith(
			characterId,
			expect.objectContaining({ name: "Rope", quantity: 2, type: "misc" }),
		);
	});
	it("lists only the authorized scope and forwards all A5 filters", async () => {
		const fakes = makeFakes();
		fakes.repository.listItems.mockResolvedValue({ items: [item()], total: 1 });
		const service = createCharacterItemService(fakes);

		await service.listCharacterItems(userId, characterId, {
			search: "sword",
			type: "equipment",
			rarity: "rare",
			category: "Weapons",
			isEquipped: false,
			catalogueItemId,
		});

		expect(fakes.repository.listItems).toHaveBeenCalledWith(scopeId, {
			search: "sword",
			type: "equipment",
			rarity: "rare",
			category: "Weapons",
			isEquipped: false,
			catalogueItemId,
		});
	});
	it("treats an owned character without a scope as an empty inventory", async () => {
		const fakes = makeFakes();
		fakes.scopeRepository.findCharacterScopeId.mockResolvedValue(null);
		const service = createCharacterItemService(fakes);

		await expect(service.listCharacterItems(userId, characterId)).resolves.toEqual({
			items: [],
			total: 0,
		});
		expect(fakes.repository.listItems).not.toHaveBeenCalled();
	});
	it("does not query items for an inaccessible character", async () => {
		const fakes = makeFakes();
		fakes.characterService.getCharacter.mockRejectedValue(new CharacterNotFoundError());
		const service = createCharacterItemService(fakes);

		await expect(
			service.getCharacterItem(userId, otherCharacterId, item().id),
		).rejects.toBeInstanceOf(CharacterNotFoundError);
		expect(fakes.scopeRepository.findCharacterScopeId).not.toHaveBeenCalled();
		expect(fakes.repository.findItem).not.toHaveBeenCalled();
	});
	it("hides an item in another scope as not found", async () => {
		const fakes = makeFakes();
		fakes.repository.findItem.mockResolvedValue(null);
		const service = createCharacterItemService(fakes);

		await expect(service.getCharacterItem(userId, characterId, item().id)).rejects.toBeInstanceOf(
			CharacterItemNotFoundError,
		);
		expect(fakes.repository.findItem).toHaveBeenCalledWith(scopeId, item().id);
	});
	it("snapshots normalized catalogue fields while retaining owned fields", async () => {
		const fakes = makeFakes();
		fakes.catalogueClient.getItemDetails.mockResolvedValue(catalogueItem());
		const savedItem = item({ name: "Longsword", type: "equipment", estimatedValue: 15 });
		fakes.repository.createItemForCharacterWithHistory.mockResolvedValue(savedItem);
		const service = createCharacterItemService(fakes);

		await service.createCharacterItem(userId, characterId, {
			name: "Manual name is replaced",
			type: "misc",
			category: "Manual category",
			quantity: 3,
			properties: {},
			notes: "Keep polished",
			catalogueItemId,
		});

		expect(fakes.repository.createItemForCharacterWithHistory).toHaveBeenCalledWith(
			characterId,
			expect.objectContaining({
				name: "Longsword",
				type: "equipment",
				category: "Weapons",
				quantity: 3,
				notes: "Keep polished",
				catalogueItemId,
				catalogueSourceKey: "phbwepLongsword",
				catalogueRulesVersion: "2024",
				estimatedValue: 15,
			}),
		);
	});
	it("maps missing and unavailable catalogue references explicitly", async () => {
		const fakes = makeFakes();
		const service = createCharacterItemService(fakes);

		fakes.catalogueClient.getItemDetails.mockResolvedValue(null);
		await expect(
			service.createCharacterItem(userId, characterId, createRequest()),
		).rejects.toBeInstanceOf(CatalogueItemNotFoundError);

		fakes.catalogueClient.getItemDetails.mockRejectedValue(
			new CatalogueItemClientUnavailableError(),
		);
		await expect(
			service.createCharacterItem(userId, characterId, createRequest()),
		).rejects.toBeInstanceOf(CatalogueItemUnavailableError);
	});
});
function makeFakes() {
	const repository = {
		createItem: vi.fn(),
		createItemForCharacterWithHistory: vi.fn(),
		updateItemWithHistory: vi.fn(),
		deleteItemWithHistory: vi.fn(),
		setEquippedWithHistory: vi.fn(),
		findItem: vi.fn(),
		updateItem: vi.fn(),
		deleteItem: vi.fn(),
		listItems: vi.fn(),
	} as unknown as CharacterItemRepository & {
		createItemForCharacterWithHistory: ReturnType<typeof vi.fn>;
		updateItemWithHistory: ReturnType<typeof vi.fn>;
		deleteItemWithHistory: ReturnType<typeof vi.fn>;
		setEquippedWithHistory: ReturnType<typeof vi.fn>;
		findItem: ReturnType<typeof vi.fn>;
		updateItem: ReturnType<typeof vi.fn>;
		deleteItem: ReturnType<typeof vi.fn>;
		listItems: ReturnType<typeof vi.fn>;
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
	return { repository, scopeRepository, characterService, catalogueClient };
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
function createRequest() {
	return {
		name: "Longsword",
		type: "equipment" as const,
		category: "Weapons",
		quantity: 1,
		properties: {},
		catalogueItemId,
	};
}

function catalogueItem(): CatalogueItemSnapshot {
	return {
		id: catalogueItemId,
		sourceKey: "phbwepLongsword",
		rulesVersion: "2024",
		name: "Longsword",
		kind: "weapon",
		category: "Weapons",
		description: "A versatile martial weapon.",
		isMagical: false,
		rarity: null,
		requiresAttunement: false,
		costValue: 15,
		costDenomination: "gp",
		weight: 3,
		thumbnailUrl: null,
		properties: ["versatile"],
		stats: {},
	};
}
