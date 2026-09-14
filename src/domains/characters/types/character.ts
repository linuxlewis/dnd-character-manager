import { z } from "zod";
import { CharacterClassSchema } from "./character-class.js";
import { CharacterExperiencePointsSchema } from "./character-experience.js";

export const CharacterIdSchema = z.string().uuid();
export type CharacterId = z.infer<typeof CharacterIdSchema>;

export const CharacterUserIdSchema = z.string().uuid();
export const CharacterNameSchema = z.string().min(1).max(120).regex(/\S/);
export const CharacterClassNameSchema = CharacterClassSchema;
export const CharacterLevelSchema = z.number().int().min(1).max(20);
export const CreateCharacterSchema = z.object({
	name: CharacterNameSchema,
	class: CharacterClassSchema,
	level: CharacterLevelSchema,
});
export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;

export const CharacterSchema = z.object({
	id: CharacterIdSchema,
	userId: CharacterUserIdSchema,
	name: CharacterNameSchema,
	class: CharacterClassSchema,
	level: CharacterLevelSchema,
	experiencePoints: CharacterExperiencePointsSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});
export type Character = z.infer<typeof CharacterSchema>;

export const CharacterResponseSchema = z.object({
	id: CharacterIdSchema,
	name: CharacterNameSchema,
	class: CharacterClassSchema,
	level: CharacterLevelSchema,
	experiencePoints: CharacterExperiencePointsSchema,
	createdAt: z.iso.datetime().optional(),
	updatedAt: z.iso.datetime().optional(),
});
export type CharacterResponse = z.infer<typeof CharacterResponseSchema>;

export const CharacterSummarySchema = z.object({
	id: CharacterIdSchema,
	name: CharacterNameSchema,
	className: CharacterClassNameSchema,
	level: CharacterLevelSchema,
});
export type CharacterSummary = z.infer<typeof CharacterSummarySchema>;

export const ListCharactersResponseSchema = z.object({
	characters: z.array(CharacterSummarySchema),
});
export type ListCharactersResponse = z.infer<typeof ListCharactersResponseSchema>;

export const UpdateCharacterLevelRequestSchema = z.object({
	level: CharacterLevelSchema,
});
export type UpdateCharacterLevelRequest = z.infer<typeof UpdateCharacterLevelRequestSchema>;

export const UpdateCharacterNameRequestSchema = z.object({
	name: CharacterNameSchema,
});
export type UpdateCharacterNameRequest = z.infer<typeof UpdateCharacterNameRequestSchema>;

export const UpdateCharacterExperienceRequestSchema = z.object({
	experiencePoints: CharacterExperiencePointsSchema,
});
export type UpdateCharacterExperienceRequest = z.infer<
	typeof UpdateCharacterExperienceRequestSchema
>;
