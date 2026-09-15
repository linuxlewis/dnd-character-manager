import { CharacterLevelSchema } from "../types/character.js";
import {
	type AbilityKey,
	CHARACTER_ABILITIES,
	CHARACTER_SKILLS,
	SKILL_TO_ABILITY,
	type SkillKey,
} from "../types/character-attributes.js";

export type {
	CharacterAbilityConfig,
	CharacterSkillConfig,
} from "../types/character-attributes.js";
export {
	ABILITY_KEYS,
	CHARACTER_ABILITIES,
	CHARACTER_SKILLS,
	SKILL_KEYS,
	SKILL_TO_ABILITY,
} from "../types/character-attributes.js";

export const ABILITY_CONFIG = CHARACTER_ABILITIES;
export const SKILL_CONFIG = CHARACTER_SKILLS;

export const DND_5E_PROFICIENCY_BONUSES = [
	0, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6,
] as const;

export function getProficiencyBonus(level: number): number {
	const parsedLevel = CharacterLevelSchema.parse(level);
	return DND_5E_PROFICIENCY_BONUSES[parsedLevel];
}

export function getSkillAbility(skill: SkillKey): AbilityKey {
	return SKILL_TO_ABILITY[skill];
}

export type { AbilityKey, SkillKey };
