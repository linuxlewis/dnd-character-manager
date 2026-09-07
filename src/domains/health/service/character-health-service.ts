import type { DatabaseTransaction } from "@providers/database/index.js";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import { CharacterIdSchema } from "../../characters/types/index.js";
import { insertInitialCharacterHealth } from "../repo/character-health-repository.js";
import { type CharacterHealthRepository, createCharacterHealthRepository } from "../repo/index.js";
import {
	MaxHitPointsSchema,
	type UpdateCharacterHealthRequest,
	type UpdateCharacterHealthResponse,
} from "../types/index.js";

export interface CharacterHealthService {
	updateCharacterHealth(
		userId: string,
		characterId: string,
		input: UpdateCharacterHealthRequest,
	): Promise<UpdateCharacterHealthResponse>;
}
export function createCharacterHealthService(
	repository: CharacterHealthRepository = createCharacterHealthRepository(),
): CharacterHealthService {
	return {
		async updateCharacterHealth(userId, characterId, input) {
			const result = await repository.updateCharacterHealth(userId, characterId, input);
			if (!result) throw new CharacterNotFoundError();
			return result;
		},
	};
}
export function initializeCharacterHealth(
	characterId: string,
	maxHp: number,
	transaction: DatabaseTransaction,
) {
	return insertInitialCharacterHealth(
		CharacterIdSchema.parse(characterId),
		MaxHitPointsSchema.parse(maxHp),
		transaction,
	);
}
