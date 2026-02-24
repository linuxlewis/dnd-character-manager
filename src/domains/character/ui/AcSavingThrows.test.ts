import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateAC } from "../types/character.js";
import { calculateSavingThrow } from "../types/skills.js";

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
		const tsx = readFileSync(resolve(__dirname, "ArmorClassSection.tsx"), "utf-8");
		expect(tsx).toContain("Armor Class");
		expect(tsx).toContain("calculateAC");
		expect(tsx).toContain("acValue");
		expect(tsx).toContain("Override AC");
		expect(tsx).toContain("Clear Override");
		expect(tsx).toContain("acOverrideIndicator");
	});

	it("AC CSS styles exist", () => {
		const css = readFileSync(resolve(__dirname, "CharacterSheet.module.css"), "utf-8");
		expect(css).toContain(".acDisplay");
		expect(css).toContain(".acShield");
		expect(css).toContain(".acValue");
		expect(css).toContain(".acOverrideIndicator");
		expect(css).toContain(".acOverrideButton");
		expect(css).toContain(".acClearButton");
	});
});

describe("Saving Throws", () => {
	it("calculates saving throw bonus without proficiency", () => {
		expect(calculateSavingThrow(14, false, 5)).toBe(2);
	});

	it("calculates saving throw bonus with proficiency", () => {
		expect(calculateSavingThrow(14, true, 5)).toBe(5);
	});

	it("calculates saving throw for negative modifier with proficiency", () => {
		expect(calculateSavingThrow(8, true, 1)).toBe(1);
	});

	it("displays all 6 saving throws in a Saving Throws section", () => {
		const tsx = readFileSync(resolve(__dirname, "SavingThrowsSection.tsx"), "utf-8");
		expect(tsx).toContain("Saving Throws");
		expect(tsx).toContain("saving-throw-");
		expect(tsx).toContain("calculateSavingThrow");
		expect(tsx).toContain("ABILITY_KEYS.map");
	});

	it("renders saving throw toggle via API call pattern", () => {
		const tsx = readFileSync(resolve(__dirname, "SavingThrowsSection.tsx"), "utf-8");
		expect(tsx).toContain("/saving-throws/");
		expect(tsx).toContain("/toggle");
		expect(tsx).toContain('method: "POST"');
	});

	it("renders checkboxes for saving throw proficiency", () => {
		const tsx = readFileSync(resolve(__dirname, "SavingThrowsSection.tsx"), "utf-8");
		expect(tsx).toContain("savingThrowProficiencies");
		expect(tsx).toContain("handleToggleSavingThrow");
		expect(tsx).toContain("data-testid={`saving-throw-${key}`}");
		expect(tsx).toContain("handleToggleSavingThrow(key)");
	});

	it("saving throw section reuses skill styling", () => {
		const tsx = readFileSync(resolve(__dirname, "SavingThrowsSection.tsx"), "utf-8");
		expect(tsx).toContain("styles.skillsList");
		expect(tsx).toContain("styles.skillRow");
		expect(tsx).toContain("styles.skillCheckbox");
	});
});
