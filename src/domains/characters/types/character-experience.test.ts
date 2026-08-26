import { describe, expect, it } from "vitest";
import {
	DND_5E_EXPERIENCE_THRESHOLDS,
	getCharacterExperienceProgress,
} from "./character-experience.js";

describe("getCharacterExperienceProgress", () => {
	it("calculates progress toward the next D&D 5e level", () => {
		expect(DND_5E_EXPERIENCE_THRESHOLDS[7]).toBe(23_000);
		expect(getCharacterExperienceProgress(7, 27_000)).toEqual({
			level: 7,
			experiencePoints: 27_000,
			currentLevelMinimum: 23_000,
			nextLevel: 8,
			nextLevelMinimum: 34_000,
			experienceIntoLevel: 4_000,
			experienceForNextLevel: 11_000,
			experienceRemaining: 7_000,
			progressPercent: 36,
			isMaxLevel: false,
		});
	});

	it("caps max-level progress without a next threshold", () => {
		expect(getCharacterExperienceProgress(20, 400_000)).toEqual({
			level: 20,
			experiencePoints: 400_000,
			currentLevelMinimum: 355_000,
			nextLevel: null,
			nextLevelMinimum: null,
			experienceIntoLevel: 45_000,
			experienceForNextLevel: null,
			experienceRemaining: null,
			progressPercent: 100,
			isMaxLevel: true,
		});
	});
});
