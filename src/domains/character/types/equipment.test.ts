import { describe, expect, it } from "vitest";
import {
	AddEquipmentItemSchema,
	EquipmentItemSchema,
	ItemCategorySchema,
	UpdateEquipmentItemSchema,
	calculateCarryingCapacity,
	calculateTotalWeight,
	isEncumbered,
	toggleEquipItem,
	updateEquipmentItem,
} from "./equipment.js";

const validItem = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	name: "Longsword",
	quantity: 1,
	weight: 3,
	equipped: true,
	category: "weapon" as const,
	description: "A fine steel longsword",
};

describe("ItemCategorySchema", () => {
	it("accepts valid categories", () => {
		for (const cat of [
			"weapon",
			"armor",
			"shield",
			"ammunition",
			"potion",
			"ring",
			"wondrous",
			"gear",
			"tool",
		]) {
			expect(ItemCategorySchema.safeParse(cat).success).toBe(true);
		}
	});

	it("rejects invalid category", () => {
		expect(ItemCategorySchema.safeParse("invalid").success).toBe(false);
	});
});

describe("EquipmentItemSchema", () => {
	it("accepts valid equipment item with category", () => {
		const result = EquipmentItemSchema.safeParse(validItem);
		expect(result.success).toBe(true);
	});

	it("defaults category to gear when missing", () => {
		const result = EquipmentItemSchema.parse({
			id: "550e8400-e29b-41d4-a716-446655440000",
			name: "Rope",
			quantity: 1,
			weight: 10,
			equipped: false,
		});
		expect(result.category).toBe("gear");
		expect(result.description).toBe("");
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

	it("rejects invalid category", () => {
		const result = EquipmentItemSchema.safeParse({ ...validItem, category: "magic" });
		expect(result.success).toBe(false);
	});
});

describe("AddEquipmentItemSchema", () => {
	it("does not require id", () => {
		const result = AddEquipmentItemSchema.safeParse({
			name: "Shield",
			quantity: 1,
			weight: 6,
			equipped: false,
			category: "shield",
		});
		expect(result.success).toBe(true);
	});
});

describe("UpdateEquipmentItemSchema", () => {
	it("allows partial updates", () => {
		expect(UpdateEquipmentItemSchema.safeParse({ name: "New Name" }).success).toBe(true);
		expect(UpdateEquipmentItemSchema.safeParse({ equipped: true }).success).toBe(true);
		expect(UpdateEquipmentItemSchema.safeParse({}).success).toBe(true);
	});
});

describe("calculateTotalWeight", () => {
	it("returns 0 for empty array", () => {
		expect(calculateTotalWeight([])).toBe(0);
	});

	it("sums weight * quantity", () => {
		const equipment = [
			{ ...validItem, id: "a", weight: 3, quantity: 1 },
			{ ...validItem, id: "b", name: "Arrows", weight: 0.05, quantity: 20 },
		];
		expect(calculateTotalWeight(equipment)).toBeCloseTo(4);
	});
});

describe("calculateCarryingCapacity", () => {
	it("returns STR * 15", () => {
		expect(calculateCarryingCapacity(10)).toBe(150);
		expect(calculateCarryingCapacity(16)).toBe(240);
		expect(calculateCarryingCapacity(8)).toBe(120);
		expect(calculateCarryingCapacity(20)).toBe(300);
		expect(calculateCarryingCapacity(1)).toBe(15);
	});
});

describe("isEncumbered", () => {
	it("returns false when under capacity", () => {
		const equipment = [{ ...validItem, weight: 10, quantity: 1 }];
		expect(isEncumbered(equipment, 10)).toBe(false); // 10 < 150
	});

	it("returns false when exactly at capacity", () => {
		const equipment = [{ ...validItem, weight: 150, quantity: 1 }];
		expect(isEncumbered(equipment, 10)).toBe(false); // 150 == 150
	});

	it("returns true when over capacity", () => {
		const equipment = [{ ...validItem, weight: 151, quantity: 1 }];
		expect(isEncumbered(equipment, 10)).toBe(true); // 151 > 150
	});

	it("returns false for empty equipment", () => {
		expect(isEncumbered([], 10)).toBe(false);
	});
});

describe("toggleEquipItem", () => {
	const equipment = [
		{ ...validItem, id: "item-1", equipped: false },
		{ ...validItem, id: "item-2", equipped: true },
	];

	it("equips an unequipped item", () => {
		const result = toggleEquipItem(equipment, "item-1");
		expect(result[0].equipped).toBe(true);
		expect(result[1].equipped).toBe(true); // unchanged
	});

	it("unequips an equipped item", () => {
		const result = toggleEquipItem(equipment, "item-2");
		expect(result[0].equipped).toBe(false); // unchanged
		expect(result[1].equipped).toBe(false);
	});

	it("returns original array if item not found", () => {
		const result = toggleEquipItem(equipment, "nonexistent");
		expect(result).toEqual(equipment);
	});
});

describe("updateEquipmentItem", () => {
	const equipment = [
		{ ...validItem, id: "item-1", name: "Old Sword" },
		{ ...validItem, id: "item-2", name: "Shield" },
	];

	it("updates specified fields", () => {
		const result = updateEquipmentItem(equipment, "item-1", {
			name: "Magical Sword",
			description: "Glows blue near orcs",
		});
		expect(result[0].name).toBe("Magical Sword");
		expect(result[0].description).toBe("Glows blue near orcs");
		expect(result[1].name).toBe("Shield"); // unchanged
	});

	it("returns original array if item not found", () => {
		const result = updateEquipmentItem(equipment, "nonexistent", { name: "Test" });
		expect(result).toEqual(equipment);
	});
});
