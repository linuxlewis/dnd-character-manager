import type { CharacterRepository } from "../repo/index.js";
import { createCharacterRepository } from "../repo/index.js";
import type {
	CharacterDetail,
	CharacterSummary,
	CreateCharacterRequest,
	UpdateCharacterLevelRequest,
	UpdateCharacterNameRequest,
} from "../types/index.js";
import { CharacterNotFoundError } from "./character-errors.js";

export interface CharacterService {
	createCharacter(userId: string, input: CreateCharacterRequest): Promise<CharacterDetail>;
	listCharacters(userId: string): Promise<CharacterSummary[]>;
	getCharacter(userId: string, characterId: string): Promise<CharacterDetail>;
	updateCharacterLevel(
		userId: string,
		characterId: string,
		input: UpdateCharacterLevelRequest,
	): Promise<CharacterDetail>;
	updateCharacterName(
		userId: string,
		characterId: string,
		input: UpdateCharacterNameRequest,
	): Promise<CharacterDetail>;
}

export function createCharacterService(
	repository: CharacterRepository = createCharacterRepository(),
): CharacterService {
	return {
		createCharacter(userId, input) {
			return repository.createCharacter({
				userId,
				name: input.name.trim(),
				className: input.className,
				level: input.level,
				maxHp: input.maxHp,
			});
		},

		listCharacters(userId) {
			return repository.listCharacters(userId);
		},

		async getCharacter(userId, characterId) {
			const character = await repository.findCharacterDetail(userId, characterId);
			if (!character) throw new CharacterNotFoundError();
			return character;
		},

		async updateCharacterLevel(userId, characterId, input) {
			const character = await repository.updateCharacterLevel(userId, characterId, input.level);
			if (!character) throw new CharacterNotFoundError();
			return character;
		},

		async updateCharacterName(userId, characterId, input) {
			const character = await repository.updateCharacterName(
				userId,
				characterId,
				input.name.trim(),
			);
			if (!character) throw new CharacterNotFoundError();
			return character;
		},
	};
}
