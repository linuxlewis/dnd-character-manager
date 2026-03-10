import { describe, expect, it } from "vitest";
import {
	DICE_TYPES,
	DiceRollInputSchema,
	DieTypeSchema,
	MAX_ROLL_HISTORY,
	RollModeSchema,
	formatModifier,
	formatRollResult,
	rollDice,
	rollSingleDie,
	selectRoll,
} from "./dice.js";

describe("DieTypeSchema", () => {
	it("accepts valid die types", () => {
		for (const die of [4, 6, 8, 10, 12, 20, 100]) {
			expect(DieTypeSchema.safeParse(die).success).toBe(true);
		}
	});

	it("rejects invalid die types", () => {
		expect(DieTypeSchema.safeParse(7).success).toBe(false);
		expect(DieTypeSchema.safeParse(0).success).toBe(false);
	});
});

describe("RollModeSchema", () => {
	it("accepts valid modes", () => {
		for (const mode of ["normal", "advantage", "disadvantage"]) {
			expect(RollModeSchema.safeParse(mode).success).toBe(true);
		}
	});

	it("rejects invalid mode", () => {
		expect(RollModeSchema.safeParse("super").success).toBe(false);
	});
});

describe("DiceRollInputSchema", () => {
	it("parses minimal input with defaults", () => {
		const result = DiceRollInputSchema.parse({ die: 20 });
		expect(result.modifier).toBe(0);
		expect(result.mode).toBe("normal");
		expect(result.label).toBe("");
	});

	it("parses full input", () => {
		const result = DiceRollInputSchema.parse({
			die: 20,
			modifier: 5,
			mode: "advantage",
			label: "STR Save",
		});
		expect(result.modifier).toBe(5);
		expect(result.mode).toBe("advantage");
		expect(result.label).toBe("STR Save");
	});
});

describe("DICE_TYPES", () => {
	it("contains all standard dice including d100", () => {
		expect(DICE_TYPES).toEqual([4, 6, 8, 10, 12, 20, 100]);
	});
});

describe("rollSingleDie", () => {
	it("returns value within range for d20", () => {
		for (let i = 0; i < 100; i++) {
			const value = rollSingleDie(20);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(20);
		}
	});

	it("uses custom rng", () => {
		const rng = () => 0; // always returns minimum
		expect(rollSingleDie(20, rng)).toBe(1);
	});

	it("returns max with rng approaching 1", () => {
		const rng = () => 0.999;
		expect(rollSingleDie(20, rng)).toBe(20);
	});
});

describe("selectRoll", () => {
	it("returns first roll for normal mode", () => {
		expect(selectRoll([5, 15], "normal")).toBe(5);
	});

	it("returns highest for advantage", () => {
		expect(selectRoll([5, 15], "advantage")).toBe(15);
	});

	it("returns lowest for disadvantage", () => {
		expect(selectRoll([5, 15], "disadvantage")).toBe(5);
	});
});

describe("rollDice", () => {
	it("rolls a single die in normal mode", () => {
		const rng = () => 0.5;
		const result = rollDice({ die: 20, modifier: 0, mode: "normal", label: "" }, rng);
		expect(result.rolls).toHaveLength(1);
		expect(result.selectedRoll).toBe(result.rolls[0]);
		expect(result.total).toBe(result.selectedRoll);
	});

	it("rolls two dice in advantage mode", () => {
		let call = 0;
		const rng = () => {
			call++;
			return call === 1 ? 0.1 : 0.9;
		};
		const result = rollDice({ die: 20, modifier: 0, mode: "advantage", label: "" }, rng);
		expect(result.rolls).toHaveLength(2);
		expect(result.selectedRoll).toBe(Math.max(...result.rolls));
	});

	it("rolls two dice in disadvantage mode", () => {
		let call = 0;
		const rng = () => {
			call++;
			return call === 1 ? 0.1 : 0.9;
		};
		const result = rollDice({ die: 20, modifier: 0, mode: "disadvantage", label: "" }, rng);
		expect(result.rolls).toHaveLength(2);
		expect(result.selectedRoll).toBe(Math.min(...result.rolls));
	});

	it("adds modifier to total", () => {
		const rng = () => 0.5; // d20 → 11
		const result = rollDice({ die: 20, modifier: 5, mode: "normal", label: "" }, rng);
		expect(result.total).toBe(result.selectedRoll + 5);
	});

	it("detects critical hit on d20 rolling 20", () => {
		const rng = () => 0.999;
		const result = rollDice({ die: 20, modifier: 0, mode: "normal", label: "" }, rng);
		expect(result.selectedRoll).toBe(20);
		expect(result.isCrit).toBe(true);
		expect(result.isFumble).toBe(false);
	});

	it("detects critical fail on d20 rolling 1", () => {
		const rng = () => 0;
		const result = rollDice({ die: 20, modifier: 0, mode: "normal", label: "" }, rng);
		expect(result.selectedRoll).toBe(1);
		expect(result.isFumble).toBe(true);
		expect(result.isCrit).toBe(false);
	});

	it("does not detect crit on non-d20", () => {
		const rng = () => 0.999;
		const result = rollDice({ die: 6, modifier: 0, mode: "normal", label: "" }, rng);
		expect(result.isCrit).toBe(false);
		expect(result.isFumble).toBe(false);
	});

	it("preserves label", () => {
		const result = rollDice({ die: 20, modifier: 3, mode: "normal", label: "Athletics" });
		expect(result.label).toBe("Athletics");
	});

	it("includes timestamp", () => {
		const before = Date.now();
		const result = rollDice({ die: 20, modifier: 0, mode: "normal", label: "" });
		expect(result.timestamp).toBeGreaterThanOrEqual(before);
	});
});

describe("formatModifier", () => {
	it("formats positive modifier", () => {
		expect(formatModifier(3)).toBe("+3");
	});

	it("formats negative modifier", () => {
		expect(formatModifier(-2)).toBe("-2");
	});

	it("formats zero as +0", () => {
		expect(formatModifier(0)).toBe("+0");
	});
});

describe("formatRollResult", () => {
	it("formats basic roll without modifier", () => {
		const result = {
			die: 20 as const,
			rolls: [15],
			selectedRoll: 15,
			modifier: 0,
			total: 15,
			mode: "normal" as const,
			label: "",
			isCrit: false,
			isFumble: false,
			timestamp: 0,
		};
		expect(formatRollResult(result)).toBe("d20 = 15");
	});

	it("formats roll with modifier", () => {
		const result = {
			die: 20 as const,
			rolls: [12],
			selectedRoll: 12,
			modifier: 3,
			total: 15,
			mode: "normal" as const,
			label: "",
			isCrit: false,
			isFumble: false,
			timestamp: 0,
		};
		expect(formatRollResult(result)).toBe("d20 +3 = 15");
	});

	it("formats roll with label", () => {
		const result = {
			die: 20 as const,
			rolls: [12],
			selectedRoll: 12,
			modifier: 3,
			total: 15,
			mode: "normal" as const,
			label: "Athletics",
			isCrit: false,
			isFumble: false,
			timestamp: 0,
		};
		expect(formatRollResult(result)).toBe("Athletics: d20 +3 = 15");
	});

	it("formats roll with negative modifier", () => {
		const result = {
			die: 20 as const,
			rolls: [12],
			selectedRoll: 12,
			modifier: -1,
			total: 11,
			mode: "normal" as const,
			label: "",
			isCrit: false,
			isFumble: false,
			timestamp: 0,
		};
		expect(formatRollResult(result)).toBe("d20 -1 = 11");
	});
});

describe("MAX_ROLL_HISTORY", () => {
	it("is 20", () => {
		expect(MAX_ROLL_HISTORY).toBe(20);
	});
});
