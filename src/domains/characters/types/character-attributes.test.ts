import { describe, expect, it } from "vitest";
import {
	ABILITY_KEYS,
	AbilityScoreSchema,
	CharacterAbilityScoresSchema,
	CharacterAttributesUpdateRequestSchema,
	calculateAbilityModifier,
	calculateProficiencyContribution,
	formatSignedModifier,
	PersistedCharacterProficienciesSchema,
	SKILL_KEYS,
} from "./character-attributes.js";

const allSkills = SKILL_KEYS.map((key) => ({ key, rank: "none" as const }));
const allSavingThrows = ABILITY_KEYS.map((key) => ({ key, rank: "none" as const }));
const validUpdate = {
	scores: {
		strength: 10,
		dexterity: 10,
		constitution: 10,
		intelligence: 10,
		wisdom: 10,
		charisma: 10,
	},
	savingThrowProficiencies: allSavingThrows,
	skillProficiencies: allSkills,
};

describe("character attribute schemas", () => {
	it("accepts score boundaries and rejects empty, fractional, or out-of-range scores", () => {
		expect(AbilityScoreSchema.parse(1)).toBe(1);
		expect(AbilityScoreSchema.parse(30)).toBe(30);
		for (const invalid of [0, 31, 10.5, "", null]) {
			expect(AbilityScoreSchema.safeParse(invalid).success).toBe(false);
		}
		expect(CharacterAbilityScoresSchema.parse(validUpdate.scores)).toEqual(validUpdate.scores);
	});

	it("requires one valid, unique rank for every skill in an update", () => {
		expect(CharacterAttributesUpdateRequestSchema.parse(validUpdate)).toEqual(validUpdate);
		expect(() =>
			CharacterAttributesUpdateRequestSchema.parse({
				...validUpdate,
				skillProficiencies: allSkills.slice(1),
			}),
		).toThrow();
		expect(() =>
			CharacterAttributesUpdateRequestSchema.parse({
				...validUpdate,
				skillProficiencies: [...allSkills.slice(1), allSkills[1]],
			}),
		).toThrow();
		expect(() =>
			CharacterAttributesUpdateRequestSchema.parse({
				...validUpdate,
				savingThrowProficiencies: [
					allSavingThrows[0],
					allSavingThrows[0],
					...allSavingThrows.slice(2),
				],
			}),
		).toThrow();
		expect(() =>
			CharacterAttributesUpdateRequestSchema.parse({
				...validUpdate,
				skillProficiencies: allSkills.map((entry, index) =>
					index === 0 ? { key: "not-a-skill", rank: entry.rank } : entry,
				),
			}),
		).toThrow();
		expect(() =>
			CharacterAttributesUpdateRequestSchema.parse({
				...validUpdate,
				skillProficiencies: allSkills.map((entry, index) =>
					index === 0 ? { key: entry.key, rank: "full" } : entry,
				),
			}),
		).toThrow();
	});

	it("separates complete editor state from sparse persisted selections", () => {
		expect(
			PersistedCharacterProficienciesSchema.parse({
				savingThrowProficiencies: [{ key: "wisdom", rank: "proficient" }],
				skillProficiencies: [{ key: "stealth", rank: "expertise" }],
			}),
		).toEqual({
			savingThrowProficiencies: [{ key: "wisdom", rank: "proficient" }],
			skillProficiencies: [{ key: "stealth", rank: "expertise" }],
		});
		for (const invalid of [
			{ savingThrowProficiencies: [{ key: "wisdom", rank: "none" }], skillProficiencies: [] },
			{ savingThrowProficiencies: [{ key: "wisdom", rank: "expertise" }], skillProficiencies: [] },
			{ savingThrowProficiencies: [], skillProficiencies: [{ key: "stealth", rank: "none" }] },
		]) {
			expect(PersistedCharacterProficienciesSchema.safeParse(invalid).success).toBe(false);
		}
		expect(
			CharacterAttributesUpdateRequestSchema.parse({
				...validUpdate,
				savingThrowProficiencies: [...allSavingThrows].reverse(),
			}),
		).toEqual({
			...validUpdate,
			savingThrowProficiencies: [...allSavingThrows].reverse(),
		});
		expect(
			CharacterAttributesUpdateRequestSchema.parse({
				...validUpdate,
				skillProficiencies: [...allSkills].reverse(),
			}),
		).toEqual({
			...validUpdate,
			skillProficiencies: [...allSkills].reverse(),
		});
	});
});

describe("character attribute calculations", () => {
	it.each([
		[1, -5],
		[2, -4],
		[3, -4],
		[9, -1],
		[10, 0],
		[11, 0],
		[12, 1],
		[13, 1],
		[29, 9],
		[30, 10],
	] as const)("calculates the modifier for score %s", (score, expected) => {
		expect(calculateAbilityModifier(score)).toBe(expected);
	});

	it.each([
		["none", 3, 0],
		["half", 3, 1],
		["half", 5, 2],
		["proficient", 3, 3],
		["expertise", 3, 6],
	] as const)("calculates %s proficiency from bonus %s", (rank, bonus, expected) => {
		expect(calculateProficiencyContribution(rank, bonus)).toBe(expected);
	});

	it("formats zero and negative modifiers without a double sign", () => {
		expect(formatSignedModifier(0)).toBe("+0");
		expect(formatSignedModifier(3)).toBe("+3");
		expect(formatSignedModifier(-2)).toBe("-2");
	});
});
