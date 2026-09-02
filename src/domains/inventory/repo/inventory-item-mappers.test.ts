import { describe, expect, it } from "vitest";
import {
	parseInventoryItemUpdate,
	toInventoryItem,
	toInventoryItemInsert,
} from "./inventory-item-mappers.js";

const scopeId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const catalogueItemId = "00000000-0000-4000-8000-000000000003";

const databaseItem = {
	id: itemId,
	inventoryScopeId: scopeId,
	name: "Longsword",
	type: "equipment",
	category: "Weapon",
	rarity: "common",
	description: "A versatile weapon.",
	quantity: 1,
	weight: 3,
	estimatedValue: 15,
	notes: null,
	thumbnailUrl: null,
	catalogueItemId,
	catalogueSourceKey: "equipment.longsword",
	catalogueRulesVersion: "2024",
	properties: { damage: "1d8" },
	isEquipped: true,
	statModifiers: { attack: 1 },
	statOverrides: null,
	createdAt: new Date("2026-08-29T12:00:00.000Z"),
	updatedAt: new Date("2026-08-29T12:01:00.000Z"),
};

describe("inventory item mappers", () => {
	it("parses item rows, dates, and all JSON fields before returning values", () => {
		expect(toInventoryItem(databaseItem)).toEqual({
			...databaseItem,
			createdAt: "2026-08-29T12:00:00.000Z",
			updatedAt: "2026-08-29T12:01:00.000Z",
		});
	});

	it("applies persistence defaults and preserves catalogue snapshots", () => {
		expect(
			toInventoryItemInsert(scopeId, {
				name: "Rope",
				type: "equipment",
				category: "Adventuring Gear",
				catalogueSourceKey: "equipment.rope",
				catalogueRulesVersion: "2024",
			}),
		).toMatchObject({
			inventoryScopeId: scopeId,
			quantity: 1,
			properties: {},
			isEquipped: false,
			catalogueItemId: null,
			catalogueSourceKey: "equipment.rope",
			catalogueRulesVersion: "2024",
		});
	});

	it("does not apply create defaults to partial updates", () => {
		expect(parseInventoryItemUpdate({ quantity: 4 })).toEqual({ quantity: 4 });
	});

	it("rejects invalid rows, JSON values, and incomplete catalogue traceability", () => {
		expect(() => toInventoryItem({ ...databaseItem, quantity: 0 })).toThrow();
		expect(() => toInventoryItem({ ...databaseItem, properties: ["not an object"] })).toThrow();
		expect(() => toInventoryItem({ ...databaseItem, statModifiers: { attack: "one" } })).toThrow();
		expect(() =>
			toInventoryItemInsert(scopeId, {
				name: "Rope",
				type: "equipment",
				category: "Adventuring Gear",
				catalogueItemId,
			}),
		).toThrow();
	});
});
