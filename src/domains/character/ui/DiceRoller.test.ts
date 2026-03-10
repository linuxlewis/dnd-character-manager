import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	DICE_TYPES,
	formatModifier,
	formatRollResult,
	rollDice,
	selectRoll,
} from "../types/dice.js";

describe("DiceRoller component", () => {
	it("exports DiceRoller function", async () => {
		const mod = await import("./DiceRoller.tsx");
		expect(typeof mod.DiceRoller).toBe("function");
	});

	it("supports all standard dice including d100", () => {
		expect(DICE_TYPES).toContain(100);
		expect(DICE_TYPES).toHaveLength(7);
	});

	it("component source renders all dice types as buttons", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).toContain("DICE_TYPES.map");
		expect(src).toContain("d{die}");
	});

	it("component source supports advantage/disadvantage modes", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).toContain("advantage");
		expect(src).toContain("disadvantage");
		expect(src).toContain("cycleMode");
	});

	it("component source uses DiceRollerContext", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).toContain("useDiceRoller");
		expect(src).toContain("results");
		expect(src).toContain("rolling");
		expect(src).toContain("clearHistory");
	});

	it("component source shows roll history", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).toContain("History");
		expect(src).toContain("results.slice(1)");
	});

	it("component source shows modifier breakdown", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).toContain("formatModifier");
		expect(src).toContain("modifier");
	});

	it("component source shows advantage/disadvantage roll details", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).toContain("ADV");
		expect(src).toContain("DIS");
		expect(src).toContain("Rolls:");
	});

	it("component source shows critical hit and fumble", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).toContain("Critical Hit!");
		expect(src).toContain("Critical Fail!");
		expect(src).toContain("isCrit");
		expect(src).toContain("isFumble");
	});

	it("uses shadcn/ui Dialog and Button", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).toContain('from "../../../app/components/ui/dialog.tsx"');
		expect(src).toContain('from "../../../app/components/ui/button.tsx"');
	});

	it("does not use CSS modules", () => {
		const src = readFileSync(resolve(__dirname, "DiceRoller.tsx"), "utf-8");
		expect(src).not.toContain(".module.css");
	});
});

describe("DiceRoller roll logic", () => {
	it("advantage selects highest of two rolls", () => {
		expect(selectRoll([5, 18], "advantage")).toBe(18);
		expect(selectRoll([20, 3], "advantage")).toBe(20);
	});

	it("disadvantage selects lowest of two rolls", () => {
		expect(selectRoll([5, 18], "disadvantage")).toBe(5);
		expect(selectRoll([20, 3], "disadvantage")).toBe(3);
	});

	it("normal mode uses first roll", () => {
		expect(selectRoll([12, 7], "normal")).toBe(12);
	});

	it("modifier is applied to total", () => {
		const rng = () => 0.5;
		const result = rollDice({ die: 20, modifier: 5, mode: "normal", label: "STR Check" }, rng);
		expect(result.total).toBe(result.selectedRoll + 5);
		expect(result.label).toBe("STR Check");
	});

	it("format displays label and modifier", () => {
		const result = {
			die: 20 as const,
			rolls: [14],
			selectedRoll: 14,
			modifier: 3,
			total: 17,
			mode: "normal" as const,
			label: "Athletics",
			isCrit: false,
			isFumble: false,
			timestamp: 0,
		};
		expect(formatRollResult(result)).toBe("Athletics: d20 +3 = 17");
	});

	it("format negative modifier", () => {
		expect(formatModifier(-2)).toBe("-2");
		expect(formatModifier(0)).toBe("+0");
		expect(formatModifier(5)).toBe("+5");
	});
});

describe("DiceRollerContext", () => {
	it("exports DiceRollerProvider and useDiceRoller", async () => {
		const mod = await import("./DiceRollerContext.tsx");
		expect(typeof mod.DiceRollerProvider).toBe("function");
		expect(typeof mod.useDiceRoller).toBe("function");
	});

	it("context source provides roll, results, rolling, clearHistory", () => {
		const src = readFileSync(resolve(__dirname, "DiceRollerContext.tsx"), "utf-8");
		expect(src).toContain("results");
		expect(src).toContain("rolling");
		expect(src).toContain("roll");
		expect(src).toContain("clearHistory");
		expect(src).toContain("MAX_ROLL_HISTORY");
	});
});

describe("QuickRollButton", () => {
	it("exports QuickRollButton function", async () => {
		const mod = await import("./QuickRollButton.tsx");
		expect(typeof mod.QuickRollButton).toBe("function");
	});

	it("component source rolls d20 with modifier", () => {
		const src = readFileSync(resolve(__dirname, "QuickRollButton.tsx"), "utf-8");
		expect(src).toContain("die: 20");
		expect(src).toContain("modifier");
		expect(src).toContain("label");
		expect(src).toContain("useDiceRoller");
	});

	it("component source uses Tooltip for accessibility", () => {
		const src = readFileSync(resolve(__dirname, "QuickRollButton.tsx"), "utf-8");
		expect(src).toContain("Tooltip");
		expect(src).toContain("TooltipTrigger");
		expect(src).toContain("TooltipContent");
		expect(src).toContain("aria-label");
	});

	it("component source supports compact mode", () => {
		const src = readFileSync(resolve(__dirname, "QuickRollButton.tsx"), "utf-8");
		expect(src).toContain("compact");
	});
});

describe("Quick-roll integration in sections", () => {
	it("SavingThrowsSection includes QuickRollButton", () => {
		const src = readFileSync(resolve(__dirname, "SavingThrowsSection.tsx"), "utf-8");
		expect(src).toContain("QuickRollButton");
		expect(src).toContain("Save");
	});

	it("SkillsSection includes QuickRollButton", () => {
		const src = readFileSync(resolve(__dirname, "SkillsSection.tsx"), "utf-8");
		expect(src).toContain("QuickRollButton");
	});

	it("AbilityScoresGrid includes QuickRollButton", () => {
		const src = readFileSync(resolve(__dirname, "AbilityScoresGrid.tsx"), "utf-8");
		expect(src).toContain("QuickRollButton");
		expect(src).toContain("Check");
	});
});
