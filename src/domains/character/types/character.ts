/**
 * Character — core domain type for the character domain.
 *
 * This is the foundation layer. It imports nothing from other layers.
 * All other layers in this domain build on these types.
 */

import { z } from "zod";

const abilityScore = z.number().int().min(1).max(30);

export const AbilityScoresSchema = z.object({
	STR: abilityScore,
	DEX: abilityScore,
	CON: abilityScore,
	INT: abilityScore,
	WIS: abilityScore,
	CHA: abilityScore,
});

export type AbilityScores = z.infer<typeof AbilityScoresSchema>;

/**
 * Calculate the ability modifier for a given ability score.
 * Formula: Math.floor((score - 10) / 2)
 */
export function getAbilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

export const CharacterSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(255),
	race: z.string().min(1).max(100),
	class: z.string().min(1).max(100),
	level: z.number().int().min(1).max(20),
	abilityScores: AbilityScoresSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type Character = z.infer<typeof CharacterSchema>;

export const CreateCharacterSchema = CharacterSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;

export const UpdateCharacterSchema = CreateCharacterSchema.partial();

export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
