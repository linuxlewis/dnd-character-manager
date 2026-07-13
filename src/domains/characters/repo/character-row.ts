import { z } from "zod";
import {
	type Character,
	CharacterClassSchema,
	CharacterExperiencePointsSchema,
	CharacterIdSchema,
	CharacterLevelSchema,
	CharacterNameSchema,
	CharacterSchema,
	CharacterUserIdSchema,
} from "../types/index.js";

export const CharacterRowSchema = z.object({
	id: CharacterIdSchema,
	userId: CharacterUserIdSchema,
	name: CharacterNameSchema,
	characterClass: CharacterClassSchema,
	level: CharacterLevelSchema,
	experiencePoints: CharacterExperiencePointsSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});

export type CharacterRow = z.infer<typeof CharacterRowSchema>;

export function characterFromRow(row: unknown): Character {
	const parsed = CharacterRowSchema.parse(row);
	return CharacterSchema.parse({
		id: parsed.id,
		userId: parsed.userId,
		name: parsed.name,
		class: parsed.characterClass,
		level: parsed.level,
		experiencePoints: parsed.experiencePoints,
		createdAt: parsed.createdAt,
		updatedAt: parsed.updatedAt,
	});
}
