import type { CharacterService } from "../../characters/service/index.js";
import { CharacterNotFoundError, createCharacterService } from "../../characters/service/index.js";
import type { CharacterInventoryScopeRepository, CharacterItemRepository } from "../repo/index.js";
import {
	createCharacterInventoryScopeRepository,
	createCharacterItemRepository,
} from "../repo/index.js";
import type {
	CharacterItemResponse,
	CreateCharacterItemRequest,
	ListCharacterItemsRequest,
	ListCharacterItemsResponse,
	UpdateCharacterItemRequest,
} from "../types/index.js";
import {
	CharacterItemResponseSchema,
	CreateCharacterItemRequestSchema,
	InventoryItemSchema,
	ListCharacterItemsRequestSchema,
	ListCharacterItemsResponseSchema,
	UpdateCharacterItemRequestSchema,
} from "../types/index.js";
import type { CharacterItemCatalogueClient } from "./catalogue-item-client.js";
import { createCatalogueItemClient } from "./catalogue-item-client.js";
import {
	withCatalogueSnapshot,
	withOptionalCatalogueSnapshot,
} from "./character-item-catalogue.js";
import {
	CharacterItemNotFoundError,
	CharacterItemPersistenceError,
} from "./character-item-errors.js";
import { repositoryCall } from "./character-item-persistence.js";

export interface CharacterItemService {
	createCharacterItem(
		userId: string,
		characterId: string,
		input: CreateCharacterItemRequest,
	): Promise<CharacterItemResponse>;
	listCharacterItems(
		userId: string,
		characterId: string,
		input?: ListCharacterItemsRequest,
	): Promise<ListCharacterItemsResponse>;
	getCharacterItem(
		userId: string,
		characterId: string,
		itemId: string,
	): Promise<CharacterItemResponse>;
	updateCharacterItem(
		userId: string,
		characterId: string,
		itemId: string,
		input: UpdateCharacterItemRequest,
	): Promise<CharacterItemResponse>;
	deleteCharacterItem(userId: string, characterId: string, itemId: string): Promise<void>;
	equipCharacterItem(
		userId: string,
		characterId: string,
		itemId: string,
	): Promise<CharacterItemResponse>;
	unequipCharacterItem(
		userId: string,
		characterId: string,
		itemId: string,
	): Promise<CharacterItemResponse>;
}

export interface CharacterItemServiceOptions {
	repository?: CharacterItemRepository;
	scopeRepository?: CharacterInventoryScopeRepository;
	characterService?: Pick<CharacterService, "getCharacter">;
	catalogueClient?: CharacterItemCatalogueClient;
}

export function createCharacterItemService(
	options: CharacterItemServiceOptions = {},
): CharacterItemService {
	const repository = options.repository ?? createCharacterItemRepository();
	const scopeRepository = options.scopeRepository ?? createCharacterInventoryScopeRepository();
	const characterService = options.characterService ?? createCharacterService();
	const catalogueClient = options.catalogueClient ?? createCatalogueItemClient();

	return {
		async createCharacterItem(userId, characterId, input) {
			const request = CreateCharacterItemRequestSchema.parse(input);
			await authorizeCharacter(userId, characterId, characterService);
			const createInput = await withCatalogueSnapshot(request, catalogueClient);
			const item = await repositoryCall("create", () =>
				repository.createItemForCharacterWithHistory(characterId, createInput, userId),
			);
			return CharacterItemResponseSchema.parse({ item });
		},
		async listCharacterItems(userId, characterId, input = {}) {
			const filter = ListCharacterItemsRequestSchema.parse(input);
			const scopeId = await resolveScope(userId, characterId, characterService, scopeRepository);
			if (!scopeId) return ListCharacterItemsResponseSchema.parse({ items: [], total: 0 });
			const result = await repositoryCall("list", () => repository.listItems(scopeId, filter));
			return ListCharacterItemsResponseSchema.parse(result);
		},
		async getCharacterItem(userId, characterId, itemId) {
			const scopeId = await requireScope(userId, characterId, characterService, scopeRepository);
			const item = await findItem(repository, scopeId, itemId);
			return CharacterItemResponseSchema.parse({ item });
		},
		async updateCharacterItem(userId, characterId, itemId, input) {
			const request = UpdateCharacterItemRequestSchema.parse(input);
			const scopeId = await requireScope(userId, characterId, characterService, scopeRepository);
			await findItem(repository, scopeId, itemId);
			const updateInput = await withOptionalCatalogueSnapshot(request, catalogueClient);
			const item = await repositoryCall("update", () =>
				repository.updateItemWithHistory(scopeId, itemId, updateInput, userId),
			);
			if (!item) throw new CharacterItemNotFoundError();
			return CharacterItemResponseSchema.parse({ item });
		},
		async deleteCharacterItem(userId, characterId, itemId) {
			const scopeId = await requireScope(userId, characterId, characterService, scopeRepository);
			const item = await repositoryCall("delete", () =>
				repository.deleteItemWithHistory(scopeId, itemId, userId),
			);
			if (!item) throw new CharacterItemNotFoundError();
		},
		async equipCharacterItem(userId, characterId, itemId) {
			return setEquipped(
				userId,
				characterId,
				itemId,
				true,
				characterService,
				scopeRepository,
				repository,
				userId,
			);
		},

		async unequipCharacterItem(userId, characterId, itemId) {
			return setEquipped(
				userId,
				characterId,
				itemId,
				false,
				characterService,
				scopeRepository,
				repository,
				userId,
			);
		},
	};
}

async function resolveScope(
	userId: string,
	characterId: string,
	characterService: Pick<CharacterService, "getCharacter">,
	scopeRepository: CharacterInventoryScopeRepository,
) {
	await authorizeCharacter(userId, characterId, characterService);
	return repositoryCall("scope resolution", () =>
		scopeRepository.findCharacterScopeId(characterId),
	);
}

async function requireScope(
	userId: string,
	characterId: string,
	characterService: Pick<CharacterService, "getCharacter">,
	scopeRepository: CharacterInventoryScopeRepository,
) {
	const scopeId = await resolveScope(userId, characterId, characterService, scopeRepository);
	if (!scopeId) throw new CharacterItemNotFoundError();
	return scopeId;
}

async function authorizeCharacter(
	userId: string,
	characterId: string,
	characterService: Pick<CharacterService, "getCharacter">,
) {
	try {
		await characterService.getCharacter(userId, characterId);
	} catch (error) {
		if (error instanceof CharacterNotFoundError) throw error;
		throw new CharacterItemPersistenceError("Character authorization failed.", error);
	}
}

async function findItem(repository: CharacterItemRepository, scopeId: string, itemId: string) {
	const item = await repositoryCall("find", () => repository.findItem(scopeId, itemId));
	if (!item) throw new CharacterItemNotFoundError();
	return InventoryItemSchema.parse(item);
}

async function setEquipped(
	userId: string,
	characterId: string,
	itemId: string,
	isEquipped: boolean,
	characterService: Pick<CharacterService, "getCharacter">,
	scopeRepository: CharacterInventoryScopeRepository,
	repository: CharacterItemRepository,
	actorUserId: string,
) {
	const scopeId = await requireScope(userId, characterId, characterService, scopeRepository);
	const item = await repositoryCall("equip", () =>
		repository.setEquippedWithHistory(scopeId, itemId, isEquipped, actorUserId),
	);
	if (!item) throw new CharacterItemNotFoundError();
	return CharacterItemResponseSchema.parse({ item });
}
