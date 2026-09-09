import { describe, expect, it } from "vitest";
import {
	CharacterExperiencePointsSchema,
	CharacterExperienceProgressSchema,
} from "./character-experience.js";

describe("character experience value contracts", () => {
	it.each([0, 9_999_999])("accepts the XP boundary %s", (xp) => {
		expect(CharacterExperiencePointsSchema.parse(xp)).toBe(xp);
	});

	it.each([-1, 0.5, 10_000_000])("rejects invalid persisted XP %s", (xp) => {
		expect(CharacterExperiencePointsSchema.safeParse(xp).success).toBe(false);
	});

	it("accepts nullable max-level fields and rejects out-of-range progress", () => {
		const progress = {
			level: 20,
			experiencePoints: 355_000,
			currentLevelMinimum: 355_000,
			nextLevel: null,
			nextLevelMinimum: null,
			experienceIntoLevel: 0,
			experienceForNextLevel: null,
			experienceRemaining: null,
			progressPercent: 100,
			isMaxLevel: true,
		};
		expect(CharacterExperienceProgressSchema.parse(progress)).toEqual(progress);
		expect(
			CharacterExperienceProgressSchema.safeParse({ ...progress, progressPercent: 101 }).success,
		).toBe(false);
	});
});
