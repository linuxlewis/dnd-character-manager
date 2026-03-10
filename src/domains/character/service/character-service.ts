/**
 * Character Service — orchestration layer with validation and logging.
 *
 * May import from: types, config, repo, providers
 * Must NOT import from: runtime, ui
 */

import { createLogger } from "../../../providers/telemetry/logger.js";
import { characterRepo } from "../repo/character-repo.js";
import {
	type AbilityKey,
	type Character,
	type CharacterConditionName,
	type CreateCharacter,
	CreateCharacterSchema,
	type UpdateCharacter,
	UpdateCharacterSchema,
	type LevelUpChoices,
	LevelUpChoicesSchema,
	type LevelUpResult,
	applyDamage,
	applyHealing,
	setMaxHp,
	setTempHp,
	toggleCondition,
	applyLevelUp,
	getsAbilityScoreImprovement,
	validateAbilityScoreImprovements,
} from "../types/index.js";
import { equipmentService } from "./equipment-service.js";

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

	async getCharacterBySlug(slug: string): Promise<Character | null> {
		log.info({ slug }, "Getting character by slug");
		const character = await characterRepo.findBySlug(slug);
		if (!character) {
			log.info({ slug }, "Character not found by slug");
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

	async dealDamage(id: string, amount: number): Promise<Character | null> {
		log.info({ id, amount }, "Dealing damage");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for damage");
			return null;
		}
		const newHp = applyDamage(character.hp, amount);
		const updated = await characterRepo.update(id, { hp: newHp });
		log.info({ id, hp: newHp }, "Damage applied");
		return updated;
	},

	async healCharacter(id: string, amount: number): Promise<Character | null> {
		log.info({ id, amount }, "Healing character");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for healing");
			return null;
		}
		const newHp = applyHealing(character.hp, amount);
		const updated = await characterRepo.update(id, { hp: newHp });
		log.info({ id, hp: newHp }, "Healing applied");
		return updated;
	},

	async setTempHp(id: string, amount: number): Promise<Character | null> {
		log.info({ id, amount }, "Setting temp HP");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for temp HP");
			return null;
		}
		const hp = setTempHp(character.hp, amount);
		return characterRepo.update(id, { hp });
	},

	async setMaxHp(id: string, amount: number): Promise<Character | null> {
		log.info({ id, amount }, "Setting max HP");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for max HP");
			return null;
		}
		const hp = setMaxHp(character.hp, amount);
		return characterRepo.update(id, { hp });
	},

	async setConcentration(id: string, concentration: boolean): Promise<Character | null> {
		log.info({ id, concentration }, "Setting concentration");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for concentration");
			return null;
		}
		return characterRepo.update(id, { concentration });
	},

	async toggleCondition(
		id: string,
		conditionName: CharacterConditionName,
		durationRounds: number | null = null,
	): Promise<Character | null> {
		log.info({ id, conditionName }, "Toggling condition");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for condition toggle");
			return null;
		}
		const conditions = toggleCondition(character.conditions, conditionName, durationRounds);
		return characterRepo.update(id, { conditions });
	},

	async toggleSkillProficiency(id: string, skillName: string): Promise<Character | null> {
		log.info({ id, skillName }, "Toggling skill proficiency");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for skill toggle");
			return null;
		}
		const skills = character.skills.map((s) =>
			s.name === skillName ? { ...s, proficient: !s.proficient } : s,
		);
		const updated = await characterRepo.update(id, { skills });
		log.info({ id, skillName }, "Skill proficiency toggled");
		return updated;
	},

	addEquipment: equipmentService.addEquipment,
	removeEquipment: equipmentService.removeEquipment,
	toggleEquipItem: equipmentService.toggleEquipItem,
	updateEquipmentItem: equipmentService.updateEquipmentItem,

	async useSpellSlot(id: string, level: number): Promise<Character | null> {
		log.info({ id, level }, "Using spell slot");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for spell slot use");
			return null;
		}
		const slot = character.spellSlots.find((s) => s.level === level);
		if (!slot || slot.used >= slot.available) {
			throw new Error(`No available spell slots at level ${level}`);
		}
		const spellSlots = character.spellSlots.map((s) =>
			s.level === level ? { ...s, used: s.used + 1 } : s,
		);
		const updated = await characterRepo.update(id, { spellSlots });
		log.info({ id, level }, "Spell slot used");
		return updated;
	},

	async restoreSpellSlot(id: string, level: number): Promise<Character | null> {
		log.info({ id, level }, "Restoring spell slot");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for spell slot restore");
			return null;
		}
		const spellSlots = character.spellSlots.map((s) =>
			s.level === level ? { ...s, used: Math.max(0, s.used - 1) } : s,
		);
		const updated = await characterRepo.update(id, { spellSlots });
		log.info({ id, level }, "Spell slot restored");
		return updated;
	},

	async longRest(id: string): Promise<Character | null> {
		log.info({ id }, "Long rest");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for long rest");
			return null;
		}
		const spellSlots = character.spellSlots.map((s) => ({ ...s, used: 0 }));
		const updated = await characterRepo.update(id, {
			hp: { ...character.hp, current: character.hp.max, temp: 0 },
			spellSlots,
			concentration: false,
		});
		log.info({ id }, "Long rest completed");
		return updated;
	},

	async setAcOverride(id: string, override: number | null): Promise<Character | null> {
		log.info({ id, override }, "Setting AC override");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for AC override");
			return null;
		}
		const armorClass = { ...character.armorClass, override };
		const updated = await characterRepo.update(id, { armorClass });
		log.info({ id, override }, "AC override set");
		return updated;
	},

	async toggleSavingThrowProficiency(
		id: string,
		abilityKey: AbilityKey,
	): Promise<Character | null> {
		log.info({ id, abilityKey }, "Toggling saving throw proficiency");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for saving throw toggle");
			return null;
		}
		const profs = character.savingThrowProficiencies;
		const savingThrowProficiencies = profs.includes(abilityKey)
			? profs.filter((k) => k !== abilityKey)
			: [...profs, abilityKey];
		const updated = await characterRepo.update(id, { savingThrowProficiencies });
		log.info({ id, abilityKey }, "Saving throw proficiency toggled");
		return updated;
	},

	async levelUpCharacter(id: string, choices: LevelUpChoices): Promise<{ character: Character; result: LevelUpResult } | null> {
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
				choices.abilityScoreImprovements
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

	async deleteCharacter(id: string): Promise<boolean> {
		log.info({ id }, "Deleting character");
		const deleted = await characterRepo.delete(id);
		log.info({ id, deleted }, "Character delete result");
		return deleted;
	},
};
