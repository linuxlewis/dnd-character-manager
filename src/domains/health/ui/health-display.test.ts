import { describe, expect, it } from "vitest";
import { formatHealthChange, getHealthColor } from "./health-display.js";

describe("getHealthColor", () => {
	it("maps health percentage to green, yellow, orange, and red", () => {
		expect(getHealthColor({ currentHp: 20, maxHp: 20, temporaryHp: 0, effectiveMaxHp: 20 })).toBe(
			"green",
		);
		expect(getHealthColor({ currentHp: 14, maxHp: 20, temporaryHp: 0, effectiveMaxHp: 20 })).toBe(
			"yellow",
		);
		expect(getHealthColor({ currentHp: 8, maxHp: 20, temporaryHp: 0, effectiveMaxHp: 20 })).toBe(
			"orange",
		);
		expect(getHealthColor({ currentHp: 4, maxHp: 20, temporaryHp: 0, effectiveMaxHp: 20 })).toBe(
			"red",
		);
	});
});

describe("formatHealthChange", () => {
	it("shows only changed health fields", () => {
		expect(
			formatHealthChange({
				id: "00000000-0000-4000-8000-000000000001",
				previous: { currentHp: 10, maxHp: 20, temporaryHp: 0, effectiveMaxHp: 20 },
				next: { currentHp: 15, maxHp: 20, temporaryHp: 5, effectiveMaxHp: 25 },
				currentHpDelta: 5,
				maxHpDelta: 0,
				temporaryHpDelta: 5,
				createdAt: "2026-06-01T12:00:00.000Z",
			}),
		).toBe("HP +5, Temp HP +5");
	});
});
