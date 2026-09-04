import { buildCharacterAttributes } from "../config/index.js";
import type {
	CharacterAttributesPersistenceState,
	CharacterAttributesRepository,
} from "../repo/index.js";
import { createCharacterAttributesRepository } from "../repo/index.js";
import {
	type CharacterAttributesResponse,
	CharacterAttributesResponseSchema,
	type CharacterAttributesUpdateRequest,
	CharacterAttributesUpdateRequestSchema,
	type PersistedCharacterSkillProficiency,
	type PersistedSavingThrowProficiency,
} from "../types/index.js";
import { CharacterNotFoundError } from "./character-errors.js";
import type { CharacterService } from "./character-service.js";
import { createCharacterService } from "./character-service.js";

export interface CharacterAttributesService {
	getCharacterAttributes(userId: string, characterId: string): Promise<CharacterAttributesResponse>;
	updateCharacterAttributes(
		userId: string,
		characterId: string,
		input: CharacterAttributesUpdateRequest,
	): Promise<CharacterAttributesResponse>;
}

export interface CharacterAttributesServiceOptions {
	repository?: CharacterAttributesRepository;
	characterService?: Pick<CharacterService, "getCharacter">;
}

export function createCharacterAttributesService(
	options: CharacterAttributesServiceOptions = {},
): CharacterAttributesService {
	const configuredRepository = options.repository;
	const characterService = options.characterService ?? createCharacterService();
	const getRepository = () => configuredRepository ?? createCharacterAttributesRepository();

	return {
		async getCharacterAttributes(userId, characterId) {
			await characterService.getCharacter(userId, characterId);
			const snapshot = await getRepository().findCharacterAttributes(userId, characterId);
			if (!snapshot) throw new CharacterNotFoundError();
			return buildResponse(snapshot.level, snapshot.state);
		},

		async updateCharacterAttributes(userId, characterId, input) {
			const request = CharacterAttributesUpdateRequestSchema.parse(input);
			await characterService.getCharacter(userId, characterId);
			const snapshot = await getRepository().replaceCharacterAttributes(
				userId,
				characterId,
				request,
			);
			if (!snapshot) throw new CharacterNotFoundError();
			return buildResponse(snapshot.level, snapshot.state);
		},
	};
}

function buildResponse(
	level: number,
	persisted: CharacterAttributesPersistenceState,
): CharacterAttributesResponse {
	return CharacterAttributesResponseSchema.parse({
		attributes: buildCharacterAttributes({
			level,
			scores: persisted.scores,
			savingThrowProficiencies: persisted.savingThrowProficiencies.filter(
				(entry): entry is PersistedSavingThrowProficiency => entry.rank === "proficient",
			),
			skillProficiencies: persisted.skillProficiencies.filter(
				(entry): entry is PersistedCharacterSkillProficiency => entry.rank !== "none",
			),
		}),
	});
}
