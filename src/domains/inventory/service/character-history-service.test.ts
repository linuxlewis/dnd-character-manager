import { describe, expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import type { CharacterDetail } from "../../characters/types/index.js";
import type {
	CharacterInventoryScopeRepository,
	InventoryHistoryRepository,
} from "../repo/index.js";
import type { InventoryHistoryPage } from "../types/index.js";
import { CharacterHistoryPersistenceError } from "./character-history-errors.js";
import type { CharacterHistoryServiceOptions } from "./character-history-service.js";
import { createCharacterHistoryService } from "./character-history-service.js";

const userId = "00000000-0000-4000-8000-000000000001";
const characterId = "00000000-0000-4000-8000-000000000002";
const scopeId = "00000000-0000-4000-8000-000000000003";
const entryId = "00000000-0000-4000-8000-000000000004";

describe("CharacterHistoryService", () => {
	it("authorizes first, forwards filters and paging, and removes the scope from public entries", async () => {
		const dependencies = fakeDependencies();
		dependencies.repository.listHistoryEntries.mockResolvedValue(historyPage());
		const service = createCharacterHistoryService(dependencies.options);

		await expect(
			service.listCharacterHistory(userId, characterId, {
				limit: 2,
				offset: 1,
				action: "currency_updated",
				entityType: "currency",
			}),
		).resolves.toEqual({
			entries: [expect.not.objectContaining({ inventoryScopeId: scopeId })],
			total: 3,
			limit: 2,
			offset: 1,
			hasMore: true,
		});
		expect(dependencies.characterService.getCharacter).toHaveBeenCalledWith(userId, characterId);
		expect(dependencies.scopeRepository.findCharacterScopeId).toHaveBeenCalledWith(characterId);
		expect(dependencies.repository.listHistoryEntries).toHaveBeenCalledWith(scopeId, {
			limit: 2,
			offset: 1,
			action: "currency_updated",
			entityType: "currency",
		});
	});

	it("returns a typed empty page for an authorized character without creating a scope", async () => {
		const dependencies = fakeDependencies();
		dependencies.scopeRepository.findCharacterScopeId.mockResolvedValue(null);
		const service = createCharacterHistoryService(dependencies.options);

		await expect(
			service.listCharacterHistory(userId, characterId, { limit: 5, offset: 10 }),
		).resolves.toEqual({
			entries: [],
			total: 0,
			limit: 5,
			offset: 10,
			hasMore: false,
		});
		expect(dependencies.scopeRepository.ensureCharacterScopeId).not.toHaveBeenCalled();
		expect(dependencies.repository.listHistoryEntries).not.toHaveBeenCalled();
	});

	it("does not resolve scope or history for an inaccessible character", async () => {
		const dependencies = fakeDependencies();
		dependencies.characterService.getCharacter.mockRejectedValue(new CharacterNotFoundError());
		const service = createCharacterHistoryService(dependencies.options);

		await expect(service.listCharacterHistory(userId, characterId)).rejects.toBeInstanceOf(
			CharacterNotFoundError,
		);
		expect(dependencies.scopeRepository.findCharacterScopeId).not.toHaveBeenCalled();
		expect(dependencies.repository.listHistoryEntries).not.toHaveBeenCalled();
	});

	it("wraps repository and public response parsing failures as persistence errors", async () => {
		const dependencies = fakeDependencies();
		const service = createCharacterHistoryService(dependencies.options);

		dependencies.repository.listHistoryEntries.mockRejectedValueOnce(new Error("malformed row"));
		await expect(service.listCharacterHistory(userId, characterId)).rejects.toMatchObject({
			name: "CharacterHistoryPersistenceError",
			cause: expect.objectContaining({ message: "malformed row" }),
		});

		dependencies.repository.listHistoryEntries.mockResolvedValueOnce({
			entries: [{}],
			total: 1,
			limit: 20,
			offset: 0,
			hasMore: false,
		} as unknown as InventoryHistoryPage);
		await expect(service.listCharacterHistory(userId, characterId)).rejects.toBeInstanceOf(
			CharacterHistoryPersistenceError,
		);
	});
});

function fakeDependencies() {
	const repository = {
		listHistoryEntries: vi.fn(),
	} as unknown as InventoryHistoryRepository & {
		listHistoryEntries: ReturnType<typeof vi.fn>;
	};
	const scopeRepository = {
		findCharacterScopeId: vi.fn().mockResolvedValue(scopeId),
		ensureCharacterScopeId: vi.fn(),
	} as unknown as CharacterInventoryScopeRepository & {
		findCharacterScopeId: ReturnType<typeof vi.fn>;
		ensureCharacterScopeId: ReturnType<typeof vi.fn>;
	};
	const characterService = {
		getCharacter: vi.fn().mockResolvedValue({} as CharacterDetail),
	};
	return {
		repository,
		scopeRepository,
		characterService,
		options: {
			repository,
			scopeRepository,
			characterService,
		} satisfies CharacterHistoryServiceOptions,
	};
}

function historyPage(): InventoryHistoryPage {
	return {
		entries: [
			{
				id: entryId,
				inventoryScopeId: scopeId,
				action: "currency_updated",
				entityType: "currency",
				entityId: null,
				entityName: null,
				actorUserId: null,
				details: {
					version: 1,
					operation: "add",
					previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
					next: { cp: 0, sp: 0, gp: 1, pp: 0 },
					delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
					requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
					note: null,
				},
				createdAt: "2026-08-29T12:00:00.000Z",
			},
		],
		total: 3,
		limit: 2,
		offset: 1,
		hasMore: true,
	};
}
