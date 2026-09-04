import { describe, expect, it } from "vitest";
import {
	ABILITY_CONFIG,
	CHARACTER_SKILLS,
	DND_5E_PROFICIENCY_BONUSES,
	getProficiencyBonus,
	getSkillAbility,
	SKILL_TO_ABILITY,
} from "./character-attributes.js";

describe("character attribute configuration", () => {
	it("keeps abilities and skills in stable, complete order", () => {
		expect(ABILITY_CONFIG.map((entry) => entry.key)).toEqual([
			"strength",
			"dexterity",
			"constitution",
			"intelligence",
			"wisdom",
			"charisma",
		]);
		expect(CHARACTER_SKILLS).toHaveLength(18);
		expect(new Set(CHARACTER_SKILLS.map((entry) => entry.key)).size).toBe(18);
	});

	it("maps every standard skill to its governing ability", () => {
		const expected = {
			athletics: "strength",
			acrobatics: "dexterity",
			"sleight-of-hand": "dexterity",
			stealth: "dexterity",
			arcana: "intelligence",
			history: "intelligence",
			investigation: "intelligence",
			nature: "intelligence",
			religion: "intelligence",
			"animal-handling": "wisdom",
			insight: "wisdom",
			medicine: "wisdom",
			perception: "wisdom",
			survival: "wisdom",
			deception: "charisma",
			intimidation: "charisma",
			performance: "charisma",
			persuasion: "charisma",
		} as const;
		expect(SKILL_TO_ABILITY).toEqual(expected);
		expect(SKILL_TO_ABILITY).toEqual(
			Object.fromEntries(CHARACTER_SKILLS.map((skill) => [skill.key, skill.ability])),
		);
		for (const [skill, ability] of Object.entries(expected)) {
			expect(getSkillAbility(skill as keyof typeof expected)).toBe(ability);
		}
	});

	it.each([
		[1, 2],
		[4, 2],
		[5, 3],
		[8, 3],
		[9, 4],
		[12, 4],
		[13, 5],
		[16, 5],
		[17, 6],
		[20, 6],
	] as const)("gets proficiency bonus for level %s", (level, expected) => {
		expect(getProficiencyBonus(level)).toBe(expected);
	});

	it("rejects levels outside the configured table", () => {
		expect(DND_5E_PROFICIENCY_BONUSES).toHaveLength(21);
		expect(() => getProficiencyBonus(0)).toThrow();
		expect(() => getProficiencyBonus(21)).toThrow();
		expect(() => getProficiencyBonus(5.5)).toThrow();
	});
});
