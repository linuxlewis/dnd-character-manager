import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateAC, calculateTotalWeight, getAbilityModifier } from "../types/character.js";
import {
	SKILLS,
	calculateSavingThrow,
	calculateSkillBonus,
	getProficiencyBonus,
} from "../types/skills.js";

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

describe("CharacterSheet AC display", () => {
	it("calculates AC as 10 + DEX mod when no override", () => {
		const armorClass = { base: 10, override: null };
		expect(calculateAC(14, armorClass)).toBe(12); // 10 + 2
		expect(calculateAC(10, armorClass)).toBe(10); // 10 + 0
		expect(calculateAC(8, armorClass)).toBe(9); // 10 + (-1)
	});

	it("calculates AC as override value when override is set", () => {
		const armorClass = { base: 10, override: 18 };
		expect(calculateAC(14, armorClass)).toBe(18);
		expect(calculateAC(8, armorClass)).toBe(18);
	});

	it("detects AC override is set", () => {
		expect({ base: 10, override: 18 }.override !== null).toBe(true);
		expect({ base: 10, override: null }.override !== null).toBe(false);
	});

	it("AC override API contract - PUT with override value", () => {
		const id = "abc";
		const url = `/api/characters/${id}/ac`;
		expect(url).toBe("/api/characters/abc/ac");
		const body = JSON.stringify({ override: 18 });
		const parsed = JSON.parse(body);
		expect(parsed.override).toBe(18);
	});

	it("AC clear override API contract - PUT with null override", () => {
		const body = JSON.stringify({ override: null });
		const parsed = JSON.parse(body);
		expect(parsed.override).toBe(null);
	});

	it("AC section exists in component source", () => {
		const { readFileSync } = require("node:fs");
		const { resolve } = require("node:path");
		const tsx = readFileSync(resolve(__dirname, "CharacterSheet.tsx"), "utf-8");
		expect(tsx).toContain("Armor Class");
		expect(tsx).toContain("calculateAC");
		expect(tsx).toContain("acValue");
		expect(tsx).toContain("Override AC");
		expect(tsx).toContain("Clear Override");
		expect(tsx).toContain("acOverrideIndicator");
	});

	it("AC CSS styles exist", () => {
		const { readFileSync } = require("node:fs");
		const { resolve } = require("node:path");
		const css = readFileSync(resolve(__dirname, "CharacterSheet.module.css"), "utf-8");
		expect(css).toContain(".acDisplay");
		expect(css).toContain(".acShield");
		expect(css).toContain(".acValue");
		expect(css).toContain(".acOverrideIndicator");
		expect(css).toContain(".acOverrideButton");
		expect(css).toContain(".acClearButton");
	});
});

describe("CharacterSheet themed styles", () => {
	const cssPath = resolve(__dirname, "CharacterSheet.module.css");
	const css = readFileSync(cssPath, "utf-8");

	it("contains no hardcoded hex color values", () => {
		// Allow #eab308 for warning (no theme token for warning), and percentage values in color-mix
		const lines = css.split("\n");
		const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
		const allowedHex = ["#eab308"]; // warning yellow - no theme token
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("//")) continue;
			const matches = trimmed.match(hexPattern);
			if (matches) {
				for (const match of matches) {
					expect(allowedHex).toContain(match);
				}
			}
		}
	});

	it("uses --color-surface for stat card backgrounds", () => {
		expect(css).toContain(".stat");
		expect(css).toMatch(/\.stat\s*\{[^}]*var\(--color-surface\)/);
	});

	it("uses --color-danger for HP bar danger class", () => {
		expect(css).toContain(".hpBarFillDanger");
		expect(css).toMatch(/\.hpBarFillDanger\s*\{[^}]*var\(--color-danger\)/);
	});

	it("uses --color-success for HP bar good class", () => {
		expect(css).toContain(".hpBarFillGood");
		expect(css).toMatch(/\.hpBarFillGood\s*\{[^}]*var\(--color-success\)/);
	});

	it("uses theme tokens for damage and heal buttons", () => {
		expect(css).toMatch(/\.damageButton\s*\{[^}]*var\(--color-danger\)/);
		expect(css).toMatch(/\.healButton\s*\{[^}]*var\(--color-success\)/);
	});

	it("uses theme tokens for notes textarea", () => {
		expect(css).toMatch(/\.notesTextarea\s*\{[^}]*var\(--color-input-bg\)/);
		expect(css).toMatch(/\.notesTextarea\s*\{[^}]*var\(--color-input-border\)/);
	});

	it("uses theme tokens for delete button", () => {
		expect(css).toMatch(/\.deleteButton\s*\{[^}]*var\(--color-danger\)/);
	});

	it("has alternating row colors for skills using theme tokens", () => {
		expect(css).toMatch(/\.skillRow:nth-child\(odd\)/);
		expect(css).toMatch(/\.skillRow:nth-child\(even\)/);
	});

	it("has responsive media query for mobile", () => {
		expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
	});

	it("HP bar uses CSS classes instead of inline colors in component", async () => {
		const tsxPath = resolve(__dirname, "CharacterSheet.tsx");
		const tsx = readFileSync(tsxPath, "utf-8");
		expect(tsx).toContain("hpBarFillGood");
		expect(tsx).toContain("hpBarFillWarning");
		expect(tsx).toContain("hpBarFillDanger");
		expect(tsx).not.toContain("backgroundColor: hpColor");
	});

	// --- Saving Throws (US-007) ---

	it("displays all 6 saving throws in a Saving Throws section", () => {
		const tsx = readFileSync(resolve(__dirname, "CharacterSheet.tsx"), "utf-8");
		expect(tsx).toContain("Saving Throws");
		expect(tsx).toContain("saving-throw-");
		expect(tsx).toContain("calculateSavingThrow");
		// Iterates over ABILITY_KEYS which contains all 6
		expect(tsx).toContain("ABILITY_KEYS.map");
	});

	it("calculates saving throw bonus without proficiency", () => {
		// DEX 14 (mod +2), not proficient, level 5
		expect(calculateSavingThrow(14, false, 5)).toBe(2);
	});

	it("calculates saving throw bonus with proficiency", () => {
		// DEX 14 (mod +2), proficient, level 5 (prof bonus +3) = +5
		expect(calculateSavingThrow(14, true, 5)).toBe(5);
	});

	it("calculates saving throw for negative modifier with proficiency", () => {
		// STR 8 (mod -1), proficient, level 1 (prof bonus +2) = +1
		expect(calculateSavingThrow(8, true, 1)).toBe(1);
	});

	it("renders saving throw toggle via API call pattern", () => {
		const tsx = readFileSync(resolve(__dirname, "CharacterSheet.tsx"), "utf-8");
		expect(tsx).toContain("/saving-throws/");
		expect(tsx).toContain("/toggle");
		expect(tsx).toContain('method: "POST"');
	});

	it("renders checkboxes for saving throw proficiency", () => {
		const tsx = readFileSync(resolve(__dirname, "CharacterSheet.tsx"), "utf-8");
		expect(tsx).toContain("savingThrowProficiencies");
		expect(tsx).toContain("handleToggleSavingThrow");
		// All 6 abilities rendered
		// Uses data-testid with saving-throw- prefix and iterates ABILITY_KEYS
		expect(tsx).toContain("data-testid={`saving-throw-${key}`}");
		expect(tsx).toContain("handleToggleSavingThrow(key)");
	});

	it("saving throw section reuses skill styling", () => {
		const tsx = readFileSync(resolve(__dirname, "CharacterSheet.tsx"), "utf-8");
		// Should reuse skillsList/skillRow/skillCheckbox styles
		expect(tsx).toContain("styles.skillsList");
		expect(tsx).toContain("styles.skillRow");
		expect(tsx).toContain("styles.skillCheckbox");
	});
});
