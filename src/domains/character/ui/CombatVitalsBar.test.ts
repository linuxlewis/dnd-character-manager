import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateAC, getAbilityModifier } from "../types/character.js";

describe("CombatVitalsBar", () => {
	it("exports CombatVitalsBar component", async () => {
		const mod = await import("./CombatVitalsBar.tsx");
		expect(typeof mod.CombatVitalsBar).toBe("function");
	});

	it("uses HP color thresholds consistent with HitPointsSection", () => {
		const vitalsSource = readFileSync(resolve(__dirname, "CombatVitalsBar.tsx"), "utf-8");
		expect(vitalsSource).toContain("bg-success");
		expect(vitalsSource).toContain("bg-warning");
		expect(vitalsSource).toContain("bg-destructive");
	});

	it("displays AC using calculateAC", () => {
		const vitalsSource = readFileSync(resolve(__dirname, "CombatVitalsBar.tsx"), "utf-8");
		expect(vitalsSource).toContain("calculateAC");
	});

	it("shows initiative modifier from DEX", () => {
		const vitalsSource = readFileSync(resolve(__dirname, "CombatVitalsBar.tsx"), "utf-8");
		expect(vitalsSource).toContain("getAbilityModifier");
		expect(vitalsSource).toContain("abilityScores.DEX");
	});

	it("shows active conditions count", () => {
		const vitalsSource = readFileSync(resolve(__dirname, "CombatVitalsBar.tsx"), "utf-8");
		expect(vitalsSource).toContain("activeConditions.length");
	});

	it("calculates AC with DEX modifier", () => {
		expect(calculateAC(14, { base: 10, override: null })).toBe(12);
	});

	it("uses AC override when set", () => {
		expect(calculateAC(14, { base: 10, override: 16 })).toBe(16);
	});

	it("calculates initiative modifier from DEX score", () => {
		expect(getAbilityModifier(14)).toBe(2);
		expect(getAbilityModifier(10)).toBe(0);
		expect(getAbilityModifier(8)).toBe(-1);
	});
});
