import { z } from "zod";
import {
	CharacterClassNameSchema,
	CharacterExperiencePointsSchema,
	CharacterExperienceProgressSchema,
	CharacterLevelSchema,
	CharacterNameSchema,
	CharacterSummarySchema,
} from "../../../domains/characters/types/index.js";
import {
	CharacterHealthSchema,
	HealthChangeResponseSchema,
	MaxHitPointsSchema,
} from "../../../domains/health/types/index.js";
export const CreateCharacterRequestSchema = z.object({
	name: CharacterNameSchema,
	className: CharacterClassNameSchema,
	level: CharacterLevelSchema,
	maxHp: MaxHitPointsSchema,
});
export type CreateCharacterRequest = z.infer<typeof CreateCharacterRequestSchema>;

export const CharacterDetailSchema = CharacterSummarySchema.extend({
	experiencePoints: CharacterExperiencePointsSchema,
	experience: CharacterExperienceProgressSchema,
	health: CharacterHealthSchema,
	recentHealthChanges: z.array(HealthChangeResponseSchema).max(5),
});
export type CharacterDetail = z.infer<typeof CharacterDetailSchema>;

export const CharacterDetailResponseSchema = z.object({
	character: CharacterDetailSchema,
});
export type CharacterDetailResponse = z.infer<typeof CharacterDetailResponseSchema>;
