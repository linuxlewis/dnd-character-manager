import type { CharacterSpellRepository, DndApiSpellClient } from "../repo/index.js";
import {
	createCharacterSpellRepository,
	createDndApiSpellClient,
	DndApiSpellClientError,
} from "../repo/index.js";
import type {
	CharacterSpellDetailsResponse,
	CharacterSpellsResponse,
	SaveCharacterSpellRequest,
	SearchCharacterSpellsRequest,
	SearchCharacterSpellsResponse,
} from "../types/index.js";
import {
	CharacterSpellDetailsResponseSchema,
	SearchCharacterSpellsResponseSchema,
} from "../types/index.js";
import {
	CharacterNotFoundError,
	SpellSearchUnavailableError,
	SpellSlotUnavailableError,
} from "./character-errors.js";

export interface CharacterSpellService {
	getCharacterSpellDetails(
		userId: string,
		characterId: string,
		spellId: string,
	): Promise<CharacterSpellDetailsResponse>;
	listCharacterSpells(userId: string, characterId: string): Promise<CharacterSpellsResponse>;
	searchCharacterSpells(
		userId: string,
		characterId: string,
		input: SearchCharacterSpellsRequest,
	): Promise<SearchCharacterSpellsResponse>;
	saveCharacterSpell(
		userId: string,
		characterId: string,
		input: SaveCharacterSpellRequest,
	): Promise<CharacterSpellsResponse>;
	removeCharacterSpell(
		userId: string,
		characterId: string,
		spellId: string,
	): Promise<CharacterSpellsResponse>;
}

export function createCharacterSpellService(
	repository: CharacterSpellRepository = createCharacterSpellRepository(),
	spellsClient: DndApiSpellClient = createDndApiSpellClient(),
): CharacterSpellService {
	return {
		async getCharacterSpellDetails(userId, characterId, spellId) {
			const savedSpell = await repository.getCharacterSpell(userId, characterId, spellId);
			if (!savedSpell) throw new CharacterNotFoundError();

			try {
				const details = await spellsClient.getSpellDetails(
					savedSpell.spellIndex,
					savedSpell.source,
				);
				return CharacterSpellDetailsResponseSchema.parse({
					spell: {
						...savedSpell,
						name: details.name,
						level: details.level,
						url: details.url,
						source: details.source,
						desc: details.desc,
						higherLevel: details.higherLevel,
						metadata: details.metadata,
					},
				});
			} catch (error) {
				if (error instanceof DndApiSpellClientError) {
					throw new SpellSearchUnavailableError();
				}
				throw error;
			}
		},

		async listCharacterSpells(userId, characterId) {
			const spells = await repository.listCharacterSpells(userId, characterId);
			if (!spells) throw new CharacterNotFoundError();
			return { spells };
		},

		async searchCharacterSpells(userId, characterId, input) {
			if (!(await repository.characterExists(userId, characterId))) {
				throw new CharacterNotFoundError();
			}

			try {
				return SearchCharacterSpellsResponseSchema.parse({
					spells: await spellsClient.searchSpells(input),
				});
			} catch (error) {
				if (error instanceof DndApiSpellClientError) {
					throw new SpellSearchUnavailableError();
				}
				throw error;
			}
		},

		async saveCharacterSpell(userId, characterId, input) {
			if (!(await repository.characterExists(userId, characterId))) {
				throw new CharacterNotFoundError();
			}

			try {
				const source = input.source ?? "spell";
				const spell = await spellsClient.findSpell(input.spellIndex, source);
				if (spell.source === "spell" && spell.level > input.slotLevel) {
					throw new SpellSlotUnavailableError("Spell level is too high for this slot.");
				}

				const response = await repository.saveCharacterSpell(userId, characterId, {
					slotLevel: input.slotLevel,
					source: spell.source,
					spellIndex: spell.index,
					name: spell.name,
					level: spell.level,
					url: spell.url,
				});
				if (!response) throw new CharacterNotFoundError();
				return response;
			} catch (error) {
				if (error instanceof DndApiSpellClientError) {
					throw new SpellSearchUnavailableError();
				}
				throw error;
			}
		},

		async removeCharacterSpell(userId, characterId, spellId) {
			const response = await repository.removeCharacterSpell(userId, characterId, spellId);
			if (!response) throw new CharacterNotFoundError();
			return response;
		},
	};
}
