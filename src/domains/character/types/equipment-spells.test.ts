import { describe, expect, it } from "vitest";
import { EquipmentItemSchema, SpellSlotSchema, calculateTotalWeight } from "./character.js";

describe("SpellSlotSchema", () => {
	it("accepts valid spell slot", () => {
		const result = SpellSlotSchema.safeParse({ level: 3, used: 1, available: 4 });
		expect(result.success).toBe(true);
	});

	it("rejects level 0", () => {
		const result = SpellSlotSchema.safeParse({ level: 0, used: 0, available: 2 });
		expect(result.success).toBe(false);
	});

	it("rejects level 10", () => {
		const result = SpellSlotSchema.safeParse({ level: 10, used: 0, available: 2 });
		expect(result.success).toBe(false);
	});

	it("rejects used > available", () => {
		const result = SpellSlotSchema.safeParse({ level: 1, used: 5, available: 3 });
		expect(result.success).toBe(false);
	});

	it("accepts used == available", () => {
		const result = SpellSlotSchema.safeParse({ level: 9, used: 1, available: 1 });
		expect(result.success).toBe(true);
	});
});

describe("EquipmentItemSchema", () => {
	const validItem = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		name: "Longsword",
		quantity: 1,
		weight: 3,
		equipped: true,
	};

	it("accepts valid equipment item", () => {
		const result = EquipmentItemSchema.safeParse(validItem);
		expect(result.success).toBe(true);
	});

	it("rejects quantity 0", () => {
		const result = EquipmentItemSchema.safeParse({ ...validItem, quantity: 0 });
		expect(result.success).toBe(false);
	});

	it("rejects negative weight", () => {
		const result = EquipmentItemSchema.safeParse({ ...validItem, weight: -1 });
		expect(result.success).toBe(false);
	});

	it("accepts weight 0", () => {
		const result = EquipmentItemSchema.safeParse({ ...validItem, weight: 0 });
		expect(result.success).toBe(true);
	});

	it("rejects empty name", () => {
		const result = EquipmentItemSchema.safeParse({ ...validItem, name: "" });
		expect(result.success).toBe(false);
	});
});

describe("calculateTotalWeight", () => {
	it("returns 0 for empty array", () => {
		expect(calculateTotalWeight([])).toBe(0);
	});

	it("sums weight * quantity", () => {
		const equipment = [
			{ id: "a", name: "Sword", quantity: 1, weight: 3, equipped: true },
			{ id: "b", name: "Arrows", quantity: 20, weight: 0.05, equipped: false },
		];
		expect(calculateTotalWeight(equipment)).toBeCloseTo(4);
	});
});
