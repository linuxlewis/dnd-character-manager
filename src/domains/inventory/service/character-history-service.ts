import type { CharacterService } from "../../characters/service/index.js";
import { createCharacterService } from "../../characters/service/index.js";
import type {
	CharacterInventoryScopeRepository,
	InventoryHistoryRepository,
} from "../repo/index.js";
import {
	createCharacterInventoryScopeRepository,
	createInventoryHistoryRepository,
} from "../repo/index.js";
import type {
	InventoryHistoryPage,
	ListCharacterHistoryRequest,
	ListCharacterHistoryResponse,
} from "../types/index.js";
import {
	ListCharacterHistoryRequestSchema,
	ListCharacterHistoryResponseSchema,
} from "../types/index.js";
import { CharacterHistoryPersistenceError } from "./character-history-errors.js";

export interface CharacterHistoryService {
	listCharacterHistory(
		userId: string,
		characterId: string,
		input?: Partial<ListCharacterHistoryRequest>,
	): Promise<ListCharacterHistoryResponse>;
}

export interface CharacterHistoryServiceOptions {
	repository?: InventoryHistoryRepository;
	scopeRepository?: CharacterInventoryScopeRepository;
	characterService?: Pick<CharacterService, "getCharacter">;
}

export function createCharacterHistoryService(
	options: CharacterHistoryServiceOptions = {},
): CharacterHistoryService {
	const repository = options.repository ?? createInventoryHistoryRepository();
	const scopeRepository = options.scopeRepository ?? createCharacterInventoryScopeRepository();
	const characterService = options.characterService ?? createCharacterService();

	return {
		async listCharacterHistory(userId, characterId, input = {}) {
			const request = ListCharacterHistoryRequestSchema.parse(input);
			await characterService.getCharacter(userId, characterId);
			try {
				const scopeId = await scopeRepository.findCharacterScopeId(characterId);
				if (!scopeId) return emptyHistoryPage(request);

				const page = await repository.listHistoryEntries(scopeId, request);
				return toCharacterHistoryPage(page);
			} catch (error) {
				throw new CharacterHistoryPersistenceError(undefined, error);
			}
		},
	};
}

function emptyHistoryPage(request: ListCharacterHistoryRequest): ListCharacterHistoryResponse {
	return ListCharacterHistoryResponseSchema.parse({
		entries: [],
		total: 0,
		limit: request.limit,
		offset: request.offset,
		hasMore: false,
	});
}

function toCharacterHistoryPage(page: InventoryHistoryPage): ListCharacterHistoryResponse {
	return ListCharacterHistoryResponseSchema.parse({
		...page,
		entries: page.entries.map(({ inventoryScopeId: _inventoryScopeId, ...entry }) => entry),
	});
}
