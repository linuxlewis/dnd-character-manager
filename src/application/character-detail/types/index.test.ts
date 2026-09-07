import { describe, expect, it } from "vitest";
import { CharacterDetailResponseSchema, CreateCharacterRequestSchema } from "./index.js";

describe("CreateCharacterRequestSchema", () => {
	it("accepts the character creation MVP fields plus initial max HP", () => {
		expect(
			CreateCharacterRequestSchema.parse({
				name: "Mira",
				className: "Fighter",
				level: 3,
				maxHp: 28,
			}),
		).toEqual({
			name: "Mira",
			className: "Fighter",
			level: 3,
			maxHp: 28,
		});
	});

	it("rejects empty names and invalid levels", () => {
		expect(() =>
			CreateCharacterRequestSchema.parse({
				name: " ",
				className: "Wizard",
				level: 21,
				maxHp: 12,
			}),
		).toThrow();
	});
});

describe("CharacterDetailResponseSchema", () => {
	it("describes the detail payload used by the character detail page", () => {
		const response = {
			character: {
				id: "00000000-0000-4000-8000-000000000001",
				name: "Mira",
				className: "Fighter",
				level: 3,
				experiencePoints: 900,
				experience: {
					level: 3,
					experiencePoints: 900,
					currentLevelMinimum: 900,
					nextLevel: 4,
					nextLevelMinimum: 2_700,
					experienceIntoLevel: 0,
					experienceForNextLevel: 1_800,
					experienceRemaining: 1_800,
					progressPercent: 0,
					isMaxLevel: false,
				},
				health: {
					currentHp: 28,
					maxHp: 28,
					temporaryHp: 0,
					effectiveMaxHp: 28,
				},
				recentHealthChanges: [],
			},
		};

		expect(CharacterDetailResponseSchema.parse(response)).toEqual(response);
	});
});
