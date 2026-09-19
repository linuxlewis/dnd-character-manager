import type { DatabaseTransaction } from "@providers/database/index.js";
import { buildCharacterAttributes } from "../config/index.js";
import type {
	CharacterAttributesPersistenceState,
	CharacterAttributesRepository,
} from "../repo/index.js";
import {
	createCharacterAttributesRepository,
	insertInitialCharacterAttributes,
} from "../repo/index.js";
import {
	type CharacterAttributesResponse,
	CharacterAttributesResponseSchema,
	type CharacterAttributesUpdateRequest,
	CharacterAttributesUpdateRequestSchema,
	type PersistedCharacterSkillProficiency,
	type PersistedSavingThrowProficiency,
} from "../types/index.js";
import { CharacterNotFoundError } from "./character-errors.js";

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
}

export function createCharacterAttributesService(
	options: CharacterAttributesServiceOptions = {},
): CharacterAttributesService {
	const configuredRepository = options.repository;
	const getRepository = () => configuredRepository ?? createCharacterAttributesRepository();

	return {
		async getCharacterAttributes(userId, characterId) {
			const snapshot = await getRepository().findCharacterAttributes(userId, characterId);
			if (!snapshot) throw new CharacterNotFoundError();
			return buildResponse(snapshot.level, snapshot.state);
		},

		async updateCharacterAttributes(userId, characterId, input) {
			const request = CharacterAttributesUpdateRequestSchema.parse(input);
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

export function initializeCharacterAttributes(
	characterId: string,
	transaction: DatabaseTransaction,
) {
	return insertInitialCharacterAttributes(characterId, transaction);
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
