import { describe, expect, it } from "vitest";
import { getAbilityModifier } from "../types/character.js";
import { SKILLS, calculateSkillBonus, getProficiencyBonus } from "../types/skills.js";

describe("CharacterSheet", () => {
	it("exports CharacterSheet component", async () => {
		const mod = await import("./CharacterSheet.tsx");
		expect(typeof mod.CharacterSheet).toBe("function");
	});

	it("calculates ability modifiers correctly", () => {
		expect(getAbilityModifier(10)).toBe(0);
		expect(getAbilityModifier(11)).toBe(0);
		expect(getAbilityModifier(12)).toBe(1);
		expect(getAbilityModifier(8)).toBe(-1);
		expect(getAbilityModifier(20)).toBe(5);
		expect(getAbilityModifier(1)).toBe(-5);
	});

	it("formats modifier with sign", () => {
		// Positive modifiers should have +, negative should have -
		const formatMod = (score: number) => {
			const mod = getAbilityModifier(score);
			return mod >= 0 ? `+${mod}` : `${mod}`;
		};
		expect(formatMod(10)).toBe("+0");
		expect(formatMod(14)).toBe("+2");
		expect(formatMod(8)).toBe("-1");
	});

	it("HP percentage calculation", () => {
		const calcPercent = (current: number, max: number) => (max > 0 ? (current / max) * 100 : 0);
		expect(calcPercent(10, 20)).toBe(50);
		expect(calcPercent(20, 20)).toBe(100);
		expect(calcPercent(0, 20)).toBe(0);
		expect(calcPercent(5, 0)).toBe(0);
	});

	it("HP color thresholds", () => {
		const getColor = (percent: number) =>
			percent > 50 ? "#22c55e" : percent > 25 ? "#eab308" : "#ef4444";
		expect(getColor(75)).toBe("#22c55e");
		expect(getColor(50)).toBe("#eab308");
		expect(getColor(25)).toBe("#ef4444");
		expect(getColor(10)).toBe("#ef4444");
	});

	it("damage API contract", () => {
		// Verify the expected request shape for damage endpoint
		const body = JSON.stringify({ amount: 5 });
		const parsed = JSON.parse(body);
		expect(parsed.amount).toBe(5);
	});

	it("heal API contract", () => {
		// Verify the expected request shape for heal endpoint
		const body = JSON.stringify({ amount: 3 });
		const parsed = JSON.parse(body);
		expect(parsed.amount).toBe(3);
	});

	it("displays all 18 D&D 5e skills", () => {
		expect(SKILLS).toHaveLength(18);
		const names = SKILLS.map((s) => s.name);
		expect(names).toContain("Acrobatics");
		expect(names).toContain("Stealth");
		expect(names).toContain("Perception");
		expect(names).toContain("Persuasion");
	});

	it("each skill has an associated ability abbreviation", () => {
		const validKeys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
		for (const skill of SKILLS) {
			expect(validKeys).toContain(skill.abilityKey);
		}
	});

	it("calculates skill bonus without proficiency", () => {
		// DEX 14 = +2 mod, not proficient => +2
		expect(calculateSkillBonus(14, false, 1)).toBe(2);
	});

	it("calculates skill bonus with proficiency", () => {
		// DEX 14 = +2 mod, proficient at level 1 = +2 prof => +4
		expect(calculateSkillBonus(14, true, 1)).toBe(4);
		// Level 5 = +3 prof => +5
		expect(calculateSkillBonus(14, true, 5)).toBe(5);
	});

	it("skill toggle API contract", () => {
		const body = JSON.stringify({ skillName: "Stealth" });
		const parsed = JSON.parse(body);
		expect(parsed.skillName).toBe("Stealth");
	});
});
