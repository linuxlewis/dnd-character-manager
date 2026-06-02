import { type CharacterRepo, createCharacterRepo } from "../repo/character-repo.js";
import type { Character, CreateCharacter } from "../types/index.js";
import { CreateCharacterSchema } from "../types/index.js";

export interface CharacterService {
	createCharacter(input: { userId: string; character: CreateCharacter }): Promise<Character>;
	getCharacter(input: { id: string; userId: string }): Promise<Character | null>;
	listCharacters(userId: string): Promise<Character[]>;
}

export function createCharacterService(
	repo: CharacterRepo = createCharacterRepo(),
): CharacterService {
	return {
		async createCharacter(input) {
			const character = CreateCharacterSchema.parse(input.character);
			return repo.create({
				userId: input.userId,
				...character,
			});
		},

		async getCharacter(input) {
			return repo.findByIdForUser(input);
		},

		async listCharacters(userId) {
			return repo.listByUser(userId);
		},
	};
}
