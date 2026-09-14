import {
	CharacterExperiencePointsSchema,
	type CharacterExperienceProgress,
	CharacterExperienceProgressSchema,
} from "../types/character-experience.js";

export const DND_5E_EXPERIENCE_THRESHOLDS = [
	0, 0, 300, 900, 2_700, 6_500, 14_000, 23_000, 34_000, 48_000, 64_000, 85_000, 100_000, 120_000,
	140_000, 165_000, 195_000, 225_000, 265_000, 305_000, 355_000,
] as const;

export function getCharacterExperienceProgress(
	level: number,
	experiencePoints: number,
): CharacterExperienceProgress {
	const parsedLevel = CharacterExperienceProgressSchema.shape.level.parse(level);
	const parsedExperience = CharacterExperiencePointsSchema.parse(experiencePoints);
	const currentLevelMinimum = DND_5E_EXPERIENCE_THRESHOLDS[parsedLevel];
	const nextLevel = parsedLevel === 20 ? null : parsedLevel + 1;
	const nextLevelMinimum = nextLevel ? DND_5E_EXPERIENCE_THRESHOLDS[nextLevel] : null;
	const experienceIntoLevel = Math.max(0, parsedExperience - currentLevelMinimum);

	if (nextLevelMinimum === null) {
		return CharacterExperienceProgressSchema.parse({
			level: parsedLevel,
			experiencePoints: parsedExperience,
			currentLevelMinimum,
			nextLevel,
			nextLevelMinimum,
			experienceIntoLevel,
			experienceForNextLevel: null,
			experienceRemaining: null,
			progressPercent: 100,
			isMaxLevel: true,
		});
	}

	const experienceForNextLevel = nextLevelMinimum - currentLevelMinimum;
	const experienceRemaining = Math.max(0, nextLevelMinimum - parsedExperience);
	const progressPercent = Math.min(
		100,
		Math.floor((experienceIntoLevel / experienceForNextLevel) * 100),
	);

	return CharacterExperienceProgressSchema.parse({
		level: parsedLevel,
		experiencePoints: parsedExperience,
		currentLevelMinimum,
		nextLevel,
		nextLevelMinimum,
		experienceIntoLevel,
		experienceForNextLevel,
		experienceRemaining,
		progressPercent,
		isMaxLevel: false,
	});
}
