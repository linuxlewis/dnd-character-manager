import { describe, expect, it } from "vitest";
import { SKILLS, SkillSchema, calculateSkillBonus, getProficiencyBonus } from "./skills.js";

describe("SkillSchema", () => {
	it("validates a valid skill", () => {
		const result = SkillSchema.parse({
			name: "Stealth",
			abilityKey: "DEX",
			proficient: true,
		});
		expect(result.name).toBe("Stealth");
		expect(result.abilityKey).toBe("DEX");
		expect(result.proficient).toBe(true);
	});

	it("rejects invalid abilityKey", () => {
		expect(() =>
			SkillSchema.parse({ name: "Foo", abilityKey: "FOO", proficient: false }),
		).toThrow();
	});
});

describe("SKILLS", () => {
	it("has 18 skills", () => {
		expect(SKILLS).toHaveLength(18);
	});

	it("maps Athletics to STR", () => {
		expect(SKILLS.find((s) => s.name === "Athletics")?.abilityKey).toBe("STR");
	});

	it("maps Arcana to INT", () => {
		expect(SKILLS.find((s) => s.name === "Arcana")?.abilityKey).toBe("INT");
	});

	it("maps Perception to WIS", () => {
		expect(SKILLS.find((s) => s.name === "Perception")?.abilityKey).toBe("WIS");
	});
});

describe("getProficiencyBonus", () => {
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
	])("level %i → +%i", (level, expected) => {
		expect(getProficiencyBonus(level)).toBe(expected);
	});
});

describe("calculateSkillBonus", () => {
	it("returns ability mod when not proficient", () => {
		// score 14 → mod +2, not proficient, level doesn't matter
		expect(calculateSkillBonus(14, false, 5)).toBe(2);
	});

	it("returns ability mod + proficiency when proficient", () => {
		// score 14 → mod +2, proficient at level 5 → +3 prof = +5
		expect(calculateSkillBonus(14, true, 5)).toBe(5);
	});

	it("handles low ability score", () => {
		// score 8 → mod -1, proficient at level 1 → +2 prof = +1
		expect(calculateSkillBonus(8, true, 1)).toBe(1);
	});

	it("handles score 10 (mod 0) not proficient", () => {
		expect(calculateSkillBonus(10, false, 10)).toBe(0);
	});
});
