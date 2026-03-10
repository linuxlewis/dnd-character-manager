/**
 * Tests for level-up logic
 */

import { describe, expect, test } from "vitest";
import {
	calculateHpGain,
	getsAbilityScoreImprovement,
	validateAbilityScoreImprovements,
	calculateSpellSlots,
	applyLevelUp,
	CLASS_HIT_DICE,
	ABILITY_SCORE_IMPROVEMENT_LEVELS,
} from "./level-up.js";
import type { Character, AbilityScores } from "./character.js";

describe("calculateHpGain", () => {
	test("should calculate HP gain correctly for known classes", () => {
		expect(calculateHpGain("Wizard", 2)).toBe(6); // (6/2 + 1) + 2 = 6
		expect(calculateHpGain("Fighter", 3)).toBe(9); // (10/2 + 1) + 3 = 9 
		expect(calculateHpGain("Barbarian", 4)).toBe(11); // (12/2 + 1) + 4 = 11
	});

	test("should use d8 default for unknown classes", () => {
		expect(calculateHpGain("UnknownClass", 2)).toBe(7); // (8/2 + 1) + 2 = 7
	});

	test("should ensure minimum 1 HP gain", () => {
		expect(calculateHpGain("Wizard", -5)).toBe(1); // Would be -1, but minimum is 1
	});
});

describe("getsAbilityScoreImprovement", () => {
	test("should return true for ASI levels", () => {
		for (const level of ABILITY_SCORE_IMPROVEMENT_LEVELS) {
			expect(getsAbilityScoreImprovement(level)).toBe(true);
		}
	});

	test("should return false for non-ASI levels", () => {
		expect(getsAbilityScoreImprovement(1)).toBe(false);
		expect(getsAbilityScoreImprovement(3)).toBe(false);
		expect(getsAbilityScoreImprovement(5)).toBe(false);
	});
});

describe("validateAbilityScoreImprovements", () => {
	const testAbilities: AbilityScores = {
		STR: 15,
		DEX: 14,
		CON: 13,
		INT: 12,
		WIS: 10,
		CHA: 8,
	};

	test("should validate correct improvements", () => {
		const result = validateAbilityScoreImprovements(testAbilities, { STR: 1, DEX: 1 });
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test("should require exactly 2 points", () => {
		const result1 = validateAbilityScoreImprovements(testAbilities, { STR: 1 });
		expect(result1.valid).toBe(false);
		expect(result1.errors).toContain("Must spend exactly 2 ability score improvement points");

		const result2 = validateAbilityScoreImprovements(testAbilities, { STR: 2, DEX: 1 });
		expect(result2.valid).toBe(false);
		expect(result2.errors).toContain("Must spend exactly 2 ability score improvement points");
	});

	test("should prevent exceeding ability score 20", () => {
		const highAbilities = { ...testAbilities, STR: 19 };
		const result = validateAbilityScoreImprovements(highAbilities, { STR: 2 });
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("STR cannot exceed 20");
	});

	test("should prevent negative or excessive improvements", () => {
		const result = validateAbilityScoreImprovements(testAbilities, { STR: 3 });
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("STR improvement must be 0-2 points");
	});

	test("should reject invalid ability names", () => {
		const result = validateAbilityScoreImprovements(testAbilities, { INVALID: 1, STR: 1 });
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Invalid ability: INVALID");
	});
});

describe("calculateSpellSlots", () => {
	test("should return empty array for non-caster classes", () => {
		expect(calculateSpellSlots("Fighter", 5)).toEqual([]);
		expect(calculateSpellSlots("Rogue", 10)).toEqual([]);
	});

	test("should return correct spell slots for full casters", () => {
		const level1Slots = calculateSpellSlots("Wizard", 1);
		expect(level1Slots).toEqual([{ level: 1, used: 0, available: 2 }]);

		const level3Slots = calculateSpellSlots("Wizard", 3);
		expect(level3Slots).toEqual([
			{ level: 1, used: 0, available: 4 },
			{ level: 2, used: 0, available: 2 },
		]);
	});

	test("should handle Warlock differently", () => {
		const level2Warlock = calculateSpellSlots("Warlock", 2);
		expect(level2Warlock).toEqual([{ level: 1, used: 0, available: 1 }]);

		const level3Warlock = calculateSpellSlots("Warlock", 3);
		expect(level3Warlock).toEqual([{ level: 2, used: 0, available: 2 }]);
	});
});

describe("applyLevelUp", () => {
	const testCharacter: Character = {
		id: "test-id",
		slug: null,
		name: "Test Hero",
		race: "Human",
		class: "Fighter",
		level: 3,
		abilityScores: {
			STR: 16,
			DEX: 14,
			CON: 15,
			INT: 10,
			WIS: 12,
			CHA: 8,
		},
		hp: { current: 30, max: 30, temp: 0 },
		conditions: [],
		concentration: false,
		spellSlots: [],
		equipment: [],
		skills: [],
		armorClass: { base: 10, override: null },
		savingThrowProficiencies: [],
		notes: "",
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	test("should level up character correctly without choices", () => {
		const { character, result } = applyLevelUp(testCharacter, {});

		expect(character.level).toBe(4);
		expect(character.hp.max).toBe(38); // 30 + 8 (5 + 2 CON mod + 1)
		expect(character.hp.current).toBe(38);
		expect(result.newLevel).toBe(4);
		expect(result.hpGained).toBe(8);
		expect(result.proficiencyBonusChanged).toBe(false); // Same proficiency at level 3 and 4
	});

	test("should apply ability score improvements", () => {
		const choices = {
			abilityScoreImprovements: { "STR": 1, "CON": 1 },
		};
		
		const { character, result } = applyLevelUp(testCharacter, choices);

		expect(character.abilityScores.STR).toBe(17);
		expect(character.abilityScores.CON).toBe(16);
		expect(character.hp.max).toBe(39); // 30 + 9 (5 + 3 CON mod + 1)
		expect(result.abilityScoreChanges).toEqual({ STR: 1, CON: 1 });
	});

	test("should handle proficiency bonus changes", () => {
		const level4Character = { ...testCharacter, level: 4 };
		const { result } = applyLevelUp(level4Character, {});

		expect(result.proficiencyBonusChanged).toBe(true); // Level 4 to 5: +2 to +3
	});
});