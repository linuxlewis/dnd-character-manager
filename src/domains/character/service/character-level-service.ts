/**
 * Character Level Service — level-up orchestration.
 *
 * May import from: types, config, repo, providers
 * Must NOT import from: runtime, ui
 */

import { createLogger } from "../../../providers/telemetry/logger.js";
import { characterRepo } from "../repo/character-repo.js";
import {
	type Character,
	type LevelUpChoices,
	LevelUpChoicesSchema,
	type LevelUpResult,
	applyLevelUp,
	getsAbilityScoreImprovement,
	validateAbilityScoreImprovements,
} from "../types/index.js";

const log = createLogger("character-level-service");

export const characterLevelService = {
	async levelUpCharacter(
		id: string,
		choices: LevelUpChoices,
	): Promise<{ character: Character; result: LevelUpResult } | null> {
		log.info({ id, choices }, "Leveling up character");

		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for level up");
			return null;
		}

		// Validate character can level up
		if (character.level >= 20) {
			throw new Error("Character is already at maximum level (20)");
		}

		const newLevel = character.level + 1;

		// Validate ability score improvements if provided
		if (choices.abilityScoreImprovements && getsAbilityScoreImprovement(newLevel)) {
			const validation = validateAbilityScoreImprovements(
				character.abilityScores,
				choices.abilityScoreImprovements,
			);
			if (!validation.valid) {
				throw new Error(`Invalid ability score improvements: ${validation.errors.join(", ")}`);
			}
		}

		// Parse choices to ensure they're valid
		const parsedChoices = LevelUpChoicesSchema.parse(choices);

		// Apply level up
		const { character: updatedCharacter, result } = applyLevelUp(character, parsedChoices);

		// Save the updated character
		const savedCharacter = await characterRepo.update(id, {
			level: updatedCharacter.level,
			abilityScores: updatedCharacter.abilityScores,
			hp: updatedCharacter.hp,
			spellSlots: updatedCharacter.spellSlots,
		});

		if (!savedCharacter) {
			throw new Error("Failed to save character after level up");
		}

		log.info({ id, newLevel: result.newLevel }, "Character leveled up successfully");
		return { character: savedCharacter, result };
	},
};
