import { z } from "zod";

const ExperienceCharacterLevelSchema = z.number().int().min(1).max(20);

export const CharacterExperiencePointsSchema = z.number().int().min(0).max(9_999_999);

export const CharacterExperienceProgressSchema = z.object({
	level: ExperienceCharacterLevelSchema,
	experiencePoints: CharacterExperiencePointsSchema,
	currentLevelMinimum: CharacterExperiencePointsSchema,
	nextLevel: ExperienceCharacterLevelSchema.nullable(),
	nextLevelMinimum: CharacterExperiencePointsSchema.nullable(),
	experienceIntoLevel: CharacterExperiencePointsSchema,
	experienceForNextLevel: CharacterExperiencePointsSchema.nullable(),
	experienceRemaining: CharacterExperiencePointsSchema.nullable(),
	progressPercent: z.number().int().min(0).max(100),
	isMaxLevel: z.boolean(),
});
export type CharacterExperienceProgress = z.infer<typeof CharacterExperienceProgressSchema>;
