import {
	type CharacterService,
	createCharacterService,
} from "../../../domains/characters/service/index.js";
import type {
	UpdateCharacterExperienceRequest,
	UpdateCharacterLevelRequest,
	UpdateCharacterNameRequest,
} from "../../../domains/characters/types/index.js";
import { getCharacter } from "../query.js";

export function createCharacterDetailService(
	identity: CharacterService = createCharacterService(),
) {
	return {
		getCharacter,
		async updateCharacterLevel(
			userId: string,
			characterId: string,
			input: UpdateCharacterLevelRequest,
		) {
			await identity.updateCharacterLevel(userId, characterId, input);
			return getCharacter(userId, characterId);
		},
		async updateCharacterName(
			userId: string,
			characterId: string,
			input: UpdateCharacterNameRequest,
		) {
			await identity.updateCharacterName(userId, characterId, input);
			return getCharacter(userId, characterId);
		},
		async updateCharacterExperience(
			userId: string,
			characterId: string,
			input: UpdateCharacterExperienceRequest,
		) {
			await identity.updateCharacterExperience(userId, characterId, input);
			return getCharacter(userId, characterId);
		},
	};
}
