import { z } from "zod";

export const CHARACTER_CLASSES = [
	"Barbarian",
	"Bard",
	"Cleric",
	"Druid",
	"Fighter",
	"Monk",
	"Paladin",
	"Ranger",
	"Rogue",
	"Sorcerer",
	"Warlock",
	"Wizard",
] as const;

export const CharacterIdSchema = z.string().uuid();
export const CharacterUserIdSchema = z.string().uuid();
export const CharacterNameSchema = z.string().trim().min(1).max(120);
export const CharacterClassSchema = z.enum(CHARACTER_CLASSES);
export const CharacterLevelSchema = z.number().int().min(1).max(20);

export const CreateCharacterSchema = z.object({
	name: CharacterNameSchema,
	class: CharacterClassSchema,
	level: CharacterLevelSchema,
});

export const CharacterSchema = CreateCharacterSchema.extend({
	id: CharacterIdSchema,
	userId: CharacterUserIdSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const CharacterResponseSchema = CreateCharacterSchema.extend({
	id: CharacterIdSchema,
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const CharacterParamsSchema = z.object({
	id: CharacterIdSchema,
});

export const CharacterErrorResponseSchema = z.object({
	error: z.string(),
});

export type Character = z.infer<typeof CharacterSchema>;
export type CharacterClass = z.infer<typeof CharacterClassSchema>;
export type CharacterErrorResponse = z.infer<typeof CharacterErrorResponseSchema>;
export type CharacterParams = z.infer<typeof CharacterParamsSchema>;
export type CharacterResponse = z.infer<typeof CharacterResponseSchema>;
export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;
