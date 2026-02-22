/**
 * Skills — D&D 5e skill types and proficiency calculations.
 */

import { z } from "zod";
import { type AbilityScores, getAbilityModifier } from "./character.js";

export const AbilityKey = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
export type AbilityKey = z.infer<typeof AbilityKey>;

export const SkillSchema = z.object({
	name: z.string(),
	abilityKey: AbilityKey,
	proficient: z.boolean(),
});

export type Skill = z.infer<typeof SkillSchema>;

/** All 18 D&D 5e skills with their ability mappings. */
export const SKILLS: readonly { name: string; abilityKey: AbilityKey }[] = [
	{ name: "Acrobatics", abilityKey: "DEX" },
	{ name: "Animal Handling", abilityKey: "WIS" },
	{ name: "Arcana", abilityKey: "INT" },
	{ name: "Athletics", abilityKey: "STR" },
	{ name: "Deception", abilityKey: "CHA" },
	{ name: "History", abilityKey: "INT" },
	{ name: "Insight", abilityKey: "WIS" },
	{ name: "Intimidation", abilityKey: "CHA" },
	{ name: "Investigation", abilityKey: "INT" },
	{ name: "Medicine", abilityKey: "WIS" },
	{ name: "Nature", abilityKey: "INT" },
	{ name: "Perception", abilityKey: "WIS" },
	{ name: "Performance", abilityKey: "CHA" },
	{ name: "Persuasion", abilityKey: "CHA" },
	{ name: "Religion", abilityKey: "INT" },
	{ name: "Sleight of Hand", abilityKey: "DEX" },
	{ name: "Stealth", abilityKey: "DEX" },
	{ name: "Survival", abilityKey: "WIS" },
] as const;

/**
 * Get proficiency bonus for a given character level (1-20).
 */
export function getProficiencyBonus(level: number): number {
	return Math.ceil(level / 4) + 1;
}

/**
 * Calculate skill bonus.
 * Returns abilityMod + proficiencyBonus when proficient, else just abilityMod.
 */
export function calculateSkillBonus(
	abilityScore: number,
	proficient: boolean,
	level: number,
): number {
	const mod = getAbilityModifier(abilityScore);
	return proficient ? mod + getProficiencyBonus(level) : mod;
}
