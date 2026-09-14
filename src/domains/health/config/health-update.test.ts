import { describe, expect, it } from "vitest";
import { normalizeHealthUpdate, toHealthChange } from "./health-update.js";

const previousHealth = { currentHp: 10, maxHp: 20, temporaryHp: 0, effectiveMaxHp: 20 };
describe("normalizeHealthUpdate", () => {
	it("adds increased temporary HP to current HP and effective max HP", () => {
		expect(
			normalizeHealthUpdate(previousHealth, {
				currentHp: 10,
				maxHp: 20,
				temporaryHp: 5,
			}),
		).toEqual({
			currentHp: 15,
			maxHp: 20,
			temporaryHp: 5,
			effectiveMaxHp: 25,
		});
	});

	it("clamps only when temporary HP decreases", () => {
		expect(
			normalizeHealthUpdate(
				{
					currentHp: 18,
					maxHp: 20,
					temporaryHp: 5,
					effectiveMaxHp: 25,
				},
				{
					currentHp: 18,
					maxHp: 20,
					temporaryHp: 2,
				},
			),
		).toEqual({
			currentHp: 18,
			maxHp: 20,
			temporaryHp: 2,
			effectiveMaxHp: 22,
		});
	});

	it("clamps current HP when max HP is lowered below it", () => {
		expect(
			normalizeHealthUpdate(previousHealth, {
				currentHp: 10,
				maxHp: 8,
				temporaryHp: 0,
			}),
		).toEqual({
			currentHp: 8,
			maxHp: 8,
			temporaryHp: 0,
			effectiveMaxHp: 8,
		});
	});

	it("adds increased max HP to current HP", () => {
		expect(
			normalizeHealthUpdate(previousHealth, {
				currentHp: 10,
				maxHp: 25,
				temporaryHp: 0,
			}),
		).toEqual({
			currentHp: 15,
			maxHp: 25,
			temporaryHp: 0,
			effectiveMaxHp: 25,
		});
	});
});

describe("toHealthChange", () => {
	it("returns null when normalized health did not change", () => {
		expect(toHealthChange(previousHealth, previousHealth)).toBeNull();
	});

	it("records HP, max HP, and temporary HP deltas", () => {
		expect(
			toHealthChange(previousHealth, {
				currentHp: 15,
				maxHp: 22,
				temporaryHp: 5,
				effectiveMaxHp: 27,
			}),
		).toMatchObject({
			currentHpDelta: 5,
			maxHpDelta: 2,
			temporaryHpDelta: 5,
		});
	});
});
