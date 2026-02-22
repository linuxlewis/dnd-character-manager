/**
 * Character Service — orchestration layer with validation and logging.
 *
 * May import from: types, config, repo, providers
 * Must NOT import from: runtime, ui
 */

import { createLogger } from "../../../providers/telemetry/logger.js";
import { characterRepo } from "../repo/character-repo.js";
import {
	type Character,
	type CreateCharacter,
	CreateCharacterSchema,
	type UpdateCharacter,
	UpdateCharacterSchema,
} from "../types/index.js";

const log = createLogger("character-service");

export const characterService = {
	async listCharacters(): Promise<Character[]> {
		log.info("Listing all characters");
		const characters = await characterRepo.findAll();
		log.info({ count: characters.length }, "Characters listed");
		return characters;
	},

	async getCharacter(id: string): Promise<Character | null> {
		log.info({ id }, "Getting character");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found");
		}
		return character;
	},

	async createCharacter(input: CreateCharacter): Promise<Character> {
		log.info({ name: input.name }, "Creating character");
		const parsed = CreateCharacterSchema.parse(input);
		const character = await characterRepo.create(parsed);
		log.info({ id: character.id, name: character.name }, "Character created");
		return character;
	},

	async updateCharacter(id: string, input: UpdateCharacter): Promise<Character | null> {
		log.info({ id }, "Updating character");
		const parsed = UpdateCharacterSchema.parse(input);
		const character = await characterRepo.update(id, parsed);
		if (!character) {
			log.info({ id }, "Character not found for update");
		} else {
			log.info({ id }, "Character updated");
		}
		return character;
	},

	async deleteCharacter(id: string): Promise<boolean> {
		log.info({ id }, "Deleting character");
		const deleted = await characterRepo.delete(id);
		log.info({ id, deleted }, "Character delete result");
		return deleted;
	},
};
