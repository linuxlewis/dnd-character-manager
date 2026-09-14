import { describe, expect, it } from "vitest";
import {
	InventoryHistoryCurrencyAddDetailsSchema,
	InventoryHistoryCurrencyConvertDetailsSchema,
	InventoryHistoryCurrencySpendDetailsSchema,
} from "./history-currency-details.js";

describe("inventory currency history details", () => {
	it.each([
		"spend",
		"convert",
	] as const)("preserves %s refinement failures for balances outside persisted bounds", (operation) => {
		const schema =
			operation === "spend"
				? InventoryHistoryCurrencySpendDetailsSchema
				: InventoryHistoryCurrencyConvertDetailsSchema;
		const details = {
			version: 1,
			operation,
			previous: { cp: 0, sp: 0, gp: 0, pp: 1 },
			next: { cp: 0, sp: 0, gp: 10, pp: 0 },
			delta: { cp: 0, sp: 0, gp: 10, pp: -1 },
			note: null,
			requested:
				operation === "spend"
					? { amount: { denomination: "gp", amount: 1 } }
					: { from: "pp", to: "gp", amount: 1 },
		};
		for (const key of ["previous", "next"] as const) {
			for (const cp of [-1, 2_147_483_648]) {
				// Existing refinements reparse persisted balances, including during safeParse.
				expect(() => schema.safeParse({ ...details, [key]: { ...details[key], cp } })).toThrow();
			}
			expect(schema.safeParse({ ...details, [key]: { ...details[key], cp: 0.5 } }).success).toBe(
				false,
			);
		}
	});

	it("trims notes and converts blank notes to null", () => {
		const details = InventoryHistoryCurrencyAddDetailsSchema.parse({
			version: 1,
			operation: "add",
			previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
			next: { cp: 0, sp: 0, gp: 2, pp: 0 },
			delta: { cp: 0, sp: 0, gp: 2, pp: 0 },
			requested: { delta: { cp: 0, sp: 0, gp: 2, pp: 0 } },
			note: "  Added reward  ",
		});
		expect(details.note).toBe("Added reward");
		expect(
			InventoryHistoryCurrencyAddDetailsSchema.parse({ ...details, note: " \t" }).note,
		).toBeNull();
		expect(() =>
			InventoryHistoryCurrencyAddDetailsSchema.parse({
				...details,
				note: "n".repeat(501),
			}),
		).toThrow();
	});

	it("accepts spend records that make change", () => {
		expect(
			InventoryHistoryCurrencySpendDetailsSchema.parse({
				version: 1,
				operation: "spend",
				previous: { cp: 0, sp: 0, gp: 0, pp: 2 },
				next: { cp: 0, sp: 0, gp: 5, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 5, pp: -2 },
				requested: { amount: { denomination: "gp", amount: 15 } },
				note: null,
			}),
		).toBeDefined();
	});

	it("rejects unchanged or contradictory spend records", () => {
		const unchanged = {
			version: 1,
			operation: "spend" as const,
			previous: { cp: 0, sp: 0, gp: 15, pp: 0 },
			next: { cp: 0, sp: 0, gp: 15, pp: 0 },
			delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
			requested: { amount: { denomination: "gp" as const, amount: 15 } },
			note: null,
		};
		const contradictory = {
			...unchanged,
			next: { cp: 0, sp: 0, gp: 5, pp: 0 },
			delta: { cp: 0, sp: 0, gp: -10, pp: 0 },
		};

		expect(() => InventoryHistoryCurrencySpendDetailsSchema.parse(unchanged)).toThrow();
		expect(() => InventoryHistoryCurrencySpendDetailsSchema.parse(contradictory)).toThrow();
	});

	it("enforces exact convert effects and preserves copper value", () => {
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

		const unchanged = {
			version: 1 as const,
			operation: "convert" as const,
			previous: { cp: 0, sp: 0, gp: 0, pp: 1 },
			next: { cp: 0, sp: 0, gp: 0, pp: 1 },
			delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
			requested: { from: "pp" as const, to: "gp" as const, amount: 1 },
			note: null,
		};
		const contradictory = {
			...unchanged,
			next: { cp: 0, sp: 10, gp: 9, pp: 0 },
			delta: { cp: 0, sp: 10, gp: 9, pp: -1 },
		};

		expect(() => InventoryHistoryCurrencyConvertDetailsSchema.parse(unchanged)).toThrow();
		expect(() => InventoryHistoryCurrencyConvertDetailsSchema.parse(contradictory)).toThrow();
	});

	it("validates deltas for add, spend, and convert operations", () => {
		const invalidDetails = [
			{
				version: 1 as const,
				operation: "add" as const,
				previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
				next: { cp: 0, sp: 0, gp: 2, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
				requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
				note: null,
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
		];

		for (const details of invalidDetails) {
			expect(() => {
				switch (details.operation) {
					case "add":
						return InventoryHistoryCurrencyAddDetailsSchema.parse(details);
					case "spend":
						return InventoryHistoryCurrencySpendDetailsSchema.parse(details);
					case "convert":
						return InventoryHistoryCurrencyConvertDetailsSchema.parse(details);
				}
			}).toThrow();
		}
	});

	it("requires an add request delta to match the recorded delta", () => {
		expect(() =>
			InventoryHistoryCurrencyAddDetailsSchema.parse({
				version: 1,
				operation: "add",
				previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
				next: { cp: 0, sp: 0, gp: 2, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 2, pp: 0 },
				requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
				note: null,
			}),
		).toThrow();
	});
});
