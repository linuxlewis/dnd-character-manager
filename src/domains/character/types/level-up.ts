/**
 * Level-up — D&D 5e level-up types and calculations.
 */

import { z } from "zod";
import { type AbilityScores, AbilityScoresSchema, AbilityKeySchema, type Character, type SpellSlot } from "./character.js";
import { getProficiencyBonus } from "./skills.js";

/**
 * Level-up choices that the player can make.
 */
export const LevelUpChoicesSchema = z.object({
	abilityScoreImprovements: z.record(z.string(), z.number().int().min(0).max(2)).optional(),
	spellsLearned: z.array(z.string()).optional(),
	featChosen: z.string().optional(),
});

export type LevelUpChoices = z.infer<typeof LevelUpChoicesSchema>;

/**
 * Level-up result that shows what changed.
 */
export const LevelUpResultSchema = z.object({
	newLevel: z.number().int().min(1).max(20),
	hpGained: z.number().int(),
	proficiencyBonusChanged: z.boolean(),
	abilityScoreChanges: z.record(AbilityKeySchema, z.number().int()),
	newSpellSlots: z.array(z.object({
		level: z.number().int().min(1).max(9),
		available: z.number().int().min(0),
	})),
	spellsLearned: z.array(z.string()),
	featGained: z.string().optional(),
});

export type LevelUpResult = z.infer<typeof LevelUpResultSchema>;

/**
 * Hit die values for different character classes.
 */
export const CLASS_HIT_DICE: Record<string, number> = {
	// d6 classes
	"Sorcerer": 6,
	"Wizard": 6,
	// d8 classes  
	"Artificer": 8,
	"Bard": 8,
	"Cleric": 8,
	"Druid": 8,
	"Monk": 8,
	"Rogue": 8,
	"Warlock": 8,
	// d10 classes
	"Fighter": 10,
	"Paladin": 10,
	"Ranger": 10,
	// d12 classes
	"Barbarian": 12,
};

/**
 * Levels at which characters get Ability Score Improvements (or feats).
 */
export const ABILITY_SCORE_IMPROVEMENT_LEVELS = [4, 8, 12, 16, 19];

/**
 * Calculate HP gain for leveling up.
 * Uses the fixed value (half hit die + 1) + CON modifier per D&D 5e rules.
 */
export function calculateHpGain(characterClass: string, conModifier: number): number {
	const hitDie = CLASS_HIT_DICE[characterClass] ?? 8; // Default to d8 if unknown class
	const fixedValue = Math.floor(hitDie / 2) + 1;
	return Math.max(1, fixedValue + conModifier); // Minimum 1 HP per level
}

/**
 * Check if a character gets an Ability Score Improvement at this level.
 */
export function getsAbilityScoreImprovement(level: number): boolean {
	return ABILITY_SCORE_IMPROVEMENT_LEVELS.includes(level);
}

/**
 * Validate ability score improvement choices.
 * Players get 2 points to distribute, with max 20 in any ability.
 */
export function validateAbilityScoreImprovements(
	currentAbilities: AbilityScores,
	improvements: Record<string, number>
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	let totalPoints = 0;

	for (const [ability, points] of Object.entries(improvements)) {
		if (!(ability in currentAbilities)) {
			errors.push(`Invalid ability: ${ability}`);
			continue;
		}

		if (points < 0 || points > 2) {
			errors.push(`${ability} improvement must be 0-2 points`);
			continue;
		}

		const newScore = currentAbilities[ability as keyof AbilityScores] + points;
		if (newScore > 20) {
			errors.push(`${ability} cannot exceed 20`);
			continue;
		}

		totalPoints += points;
	}

	if (totalPoints !== 2) {
		errors.push("Must spend exactly 2 ability score improvement points");
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Default spell slot progression for full casters (Wizard, Sorcerer, etc.)
 * Indexed by [level-1][slot_level-1]
 */
const FULL_CASTER_SLOTS = [
	[2], // Level 1: 2 first-level slots
	[3], // Level 2: 3 first-level slots  
	[4, 2], // Level 3: 4 first-level, 2 second-level
	[4, 3], // Level 4: 4 first-level, 3 second-level
	[4, 3, 2], // Level 5: 4 first-level, 3 second-level, 2 third-level
	[4, 3, 3], // Level 6: 4 first-level, 3 second-level, 3 third-level
	[4, 3, 3, 1], // Level 7: 4 first-level, 3 second-level, 3 third-level, 1 fourth-level
	[4, 3, 3, 2], // Level 8
	[4, 3, 3, 3, 1], // Level 9
	[4, 3, 3, 3, 2], // Level 10
	[4, 3, 3, 3, 2, 1], // Level 11
	[4, 3, 3, 3, 2, 1], // Level 12
	[4, 3, 3, 3, 2, 1, 1], // Level 13
	[4, 3, 3, 3, 2, 1, 1], // Level 14
	[4, 3, 3, 3, 2, 1, 1, 1], // Level 15
	[4, 3, 3, 3, 2, 1, 1, 1], // Level 16
	[4, 3, 3, 3, 2, 1, 1, 1, 1], // Level 17
	[4, 3, 3, 3, 3, 1, 1, 1, 1], // Level 18
	[4, 3, 3, 3, 3, 2, 1, 1, 1], // Level 19
	[4, 3, 3, 3, 3, 2, 2, 1, 1], // Level 20
];

/**
 * Calculate spell slots for caster classes.
 * For now, assumes full caster progression. Could be expanded for half/third casters.
 */
export function calculateSpellSlots(characterClass: string, level: number): SpellSlot[] {
	const casterClasses = ["Wizard", "Sorcerer", "Bard", "Cleric", "Druid", "Warlock"];
	
	if (!casterClasses.includes(characterClass)) {
		return []; // Non-caster class
	}

	// Warlock has different slot progression
	if (characterClass === "Warlock") {
		if (level >= 17) return [{ level: 5, used: 0, available: 4 }];
		if (level >= 11) return [{ level: 5, used: 0, available: 3 }];
		if (level >= 9) return [{ level: 5, used: 0, available: 2 }];
		if (level >= 3) return [{ level: 2, used: 0, available: 2 }];
		return [{ level: 1, used: 0, available: 1 }];
	}

	// Full caster progression
	if (level < 1 || level > 20) return [];
	
	const slots = FULL_CASTER_SLOTS[level - 1];
	return slots.map((available, index) => ({
		level: index + 1,
		used: 0,
		available,
	}));
}

/**
 * Apply level-up to a character.
 */
export function applyLevelUp(character: Character, choices: LevelUpChoices): { 
	character: Character; 
	result: LevelUpResult 
} {
	const newLevel = character.level + 1;
	const oldProficiencyBonus = getProficiencyBonus(character.level);
	const newProficiencyBonus = getProficiencyBonus(newLevel);
	
	// Apply ability score improvements
	const abilityScoreChanges: Record<string, number> = {};
	let newAbilityScores = { ...character.abilityScores };
	
	if (choices.abilityScoreImprovements) {
		for (const [ability, improvement] of Object.entries(choices.abilityScoreImprovements)) {
			if (improvement > 0) {
				newAbilityScores[ability as keyof AbilityScores] += improvement;
				abilityScoreChanges[ability] = improvement;
			}
		}
	}
	
	// Calculate HP gain
	const conModifier = Math.floor((newAbilityScores.CON - 10) / 2);
	const hpGained = calculateHpGain(character.class, conModifier);
	const newHp = {
		current: character.hp.current + hpGained,
		max: character.hp.max + hpGained,
		temp: character.hp.temp,
	};
	
	// Calculate new spell slots
	const newSpellSlots = calculateSpellSlots(character.class, newLevel);
	
	const updatedCharacter: Character = {
		...character,
		level: newLevel,
		abilityScores: newAbilityScores,
		hp: newHp,
		spellSlots: newSpellSlots,
	};
	
	const result: LevelUpResult = {
		newLevel,
		hpGained,
		proficiencyBonusChanged: oldProficiencyBonus !== newProficiencyBonus,
		abilityScoreChanges,
		newSpellSlots: newSpellSlots.map(slot => ({
			level: slot.level,
			available: slot.available,
		})),
		spellsLearned: choices.spellsLearned ?? [],
		featGained: choices.featChosen,
	};
	
	return { character: updatedCharacter, result };
}