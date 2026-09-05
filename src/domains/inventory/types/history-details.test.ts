import { describe, expect, it } from "vitest";
import {
	InventoryHistoryCurrencyAddDetailsSchema,
	InventoryHistoryCurrencyConvertDetailsSchema,
	InventoryHistoryCurrencySpendDetailsSchema,
	InventoryHistoryItemAddedDetailsSchema,
	parseInventoryHistoryDetails,
} from "./history-details.js";

const item = {
	id: "00000000-0000-4000-8000-000000000001",
	name: "Longsword",
	type: "equipment" as const,
	category: "Martial melee",
	rarity: "common" as const,
	quantity: 1,
	weight: 3,
	estimatedValue: 15,
	isEquipped: false,
};

describe("inventory history details", () => {
	it("reads legacy currency changes payloads", () => {
		expect(
			parseInventoryHistoryDetails("currency_updated", "currency", {
				changes: {
					old: { cp: 0, sp: 0, gp: 2, pp: 1 },
					new: { cp: 5, sp: 0, gp: 2, pp: 1 },
				},
				note: "  Found in the chest  ",
			}),
		).toEqual({
			changes: {
				old: { cp: 0, sp: 0, gp: 2, pp: 1 },
				new: { cp: 5, sp: 0, gp: 2, pp: 1 },
			},
			note: "Found in the chest",
		});
	});

	it("parses spend and conversion payloads", () => {
		expect(
			InventoryHistoryCurrencySpendDetailsSchema.parse({
				version: 1,
				operation: "spend",
				previous: { cp: 0, sp: 0, gp: 15, pp: 0 },
				next: { cp: 0, sp: 0, gp: 0, pp: 0 },
				delta: { cp: 0, sp: 0, gp: -15, pp: 0 },
				requested: { amount: { denomination: "gp", amount: 15 } },
				note: "Bought climbing gear",
			}),
		).toBeDefined();
		expect(
			InventoryHistoryCurrencyConvertDetailsSchema.parse({
				version: 1,
				operation: "convert",
				previous: { cp: 0, sp: 0, gp: 0, pp: 1 },
				next: { cp: 0, sp: 0, gp: 10, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 10, pp: -1 },
				requested: { from: "pp", to: "gp", amount: 1 },
				note: null,
			}),
		).toBeDefined();
	});

	it("normalizes canonical currency notes and validates operation invariants", () => {
		const add = InventoryHistoryCurrencyAddDetailsSchema.parse({
			version: 1,
			operation: "add",
			previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
			next: { cp: 0, sp: 0, gp: 2, pp: 0 },
			delta: { cp: 0, sp: 0, gp: 2, pp: 0 },
			requested: { delta: { cp: 0, sp: 0, gp: 2, pp: 0 } },
			note: "  Added reward  ",
		});
		expect(add.note).toBe("Added reward");

		const blankNote = InventoryHistoryCurrencyAddDetailsSchema.parse({
			...add,
			note: " \t",
		});
		expect(blankNote.note).toBeNull();

		for (const details of [
			{
				...add,
				operation: "add" as const,
				delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
				requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
			},
			{
				version: 1 as const,
				operation: "spend" as const,
				previous: { cp: 0, sp: 0, gp: 15, pp: 0 },
				next: { cp: 0, sp: 0, gp: 0, pp: 0 },
				delta: { cp: 0, sp: 0, gp: -14, pp: 0 },
				requested: { amount: { denomination: "gp" as const, amount: 15 } },
				note: null,
			},
			{
				version: 1 as const,
				operation: "convert" as const,
				previous: { cp: 0, sp: 0, gp: 0, pp: 1 },
				next: { cp: 0, sp: 0, gp: 10, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 9, pp: -1 },
				requested: { from: "pp" as const, to: "gp" as const, amount: 1 },
				note: null,
			},
		]) {
			expect(() => parseInventoryHistoryDetails("currency_updated", "currency", details)).toThrow();
		}
		expect(() =>
			InventoryHistoryCurrencyAddDetailsSchema.parse({
				...add,
				requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
			}),
		).toThrow();
	});

	it("normalizes a legacy item detail object to version one", () => {
		expect(
			parseInventoryHistoryDetails("item_added", "item", {
				before: null,
				after: null,
				item: { ...item, inventoryScopeId: "00000000-0000-4000-8000-000000000002" },
			}),
		).toEqual(InventoryHistoryItemAddedDetailsSchema.parse({ version: 1, item }));
	});
});
