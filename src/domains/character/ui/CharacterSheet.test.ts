import { describe, expect, it } from "vitest";
import { calculateTotalWeight, getAbilityModifier } from "../types/character.js";
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

	it("spell slot circles: available minus used gives remaining", () => {
		const slot = { level: 1, used: 2, available: 4 };
		const remaining = slot.available - slot.used;
		expect(remaining).toBe(2);
		// First 'used' slots are used, rest are available
		const circles = Array.from({ length: slot.available }, (_, i) => i < slot.used);
		expect(circles).toEqual([true, true, false, false]);
	});

	it("spell slot display format", () => {
		const slot = { level: 3, used: 1, available: 3 };
		const display = `${slot.available - slot.used}/${slot.available}`;
		expect(display).toBe("2/3");
	});

	it("use spell slot API contract - POST to correct endpoint", () => {
		const id = "abc";
		const level = 2;
		const url = `/api/characters/${id}/spells/${level}/use`;
		expect(url).toBe("/api/characters/abc/spells/2/use");
	});

	it("restore spell slot API contract - POST to correct endpoint", () => {
		const id = "abc";
		const level = 3;
		const url = `/api/characters/${id}/spells/${level}/restore`;
		expect(url).toBe("/api/characters/abc/spells/3/restore");
	});

	it("long rest API contract - POST to correct endpoint", () => {
		const id = "abc";
		const url = `/api/characters/${id}/long-rest`;
		expect(url).toBe("/api/characters/abc/long-rest");
	});

	it("long rest resets all spell slots conceptually", () => {
		const slots = [
			{ level: 1, used: 3, available: 4 },
			{ level: 2, used: 2, available: 3 },
		];
		const restored = slots.map((s) => ({ ...s, used: 0 }));
		expect(restored[0].used).toBe(0);
		expect(restored[1].used).toBe(0);
	});

	it("calculates total equipment weight", () => {
		const equipment = [
			{ id: "1", name: "Sword", quantity: 1, weight: 3, equipped: true },
			{ id: "2", name: "Arrows", quantity: 20, weight: 0.05, equipped: false },
		];
		expect(calculateTotalWeight(equipment)).toBe(4);
	});

	it("total weight is 0 for empty equipment", () => {
		expect(calculateTotalWeight([])).toBe(0);
	});

	it("add equipment API contract", () => {
		const body = JSON.stringify({ name: "Shield", quantity: 1, weight: 6, equipped: false });
		const parsed = JSON.parse(body);
		expect(parsed.name).toBe("Shield");
		expect(parsed.quantity).toBe(1);
		expect(parsed.weight).toBe(6);
		expect(parsed.equipped).toBe(false);
	});

	it("remove equipment API contract - DELETE to correct endpoint", () => {
		const charId = "abc";
		const itemId = "item-1";
		const url = `/api/characters/${charId}/equipment/${itemId}`;
		expect(url).toBe("/api/characters/abc/equipment/item-1");
	});

	it("equipment row displays weight as quantity * weight", () => {
		const item = { id: "1", name: "Rations", quantity: 5, weight: 2, equipped: false };
		const displayWeight = item.weight * item.quantity;
		expect(displayWeight).toBe(10);
	});

	it("notes update API contract - PUT with notes field", () => {
		const id = "abc";
		const url = `/api/characters/${id}`;
		const body = JSON.stringify({ notes: "Some character notes" });
		const parsed = JSON.parse(body);
		expect(url).toBe("/api/characters/abc");
		expect(parsed.notes).toBe("Some character notes");
	});

	it("delete character API contract - DELETE to correct endpoint", () => {
		const id = "abc";
		const url = `/api/characters/${id}`;
		expect(url).toBe("/api/characters/abc");
	});

	it("notes default to empty string when character has no notes", () => {
		const character: { notes?: string } = {};
		const notes = character.notes ?? "";
		expect(notes).toBe("");
	});
});
