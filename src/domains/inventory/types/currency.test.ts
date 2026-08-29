import { describe, expect, it } from "vitest";
import {
	CurrencyAddRequestSchema,
	CurrencyBalanceSchema,
	CurrencyConversionRequestSchema,
	CurrencyDeltaSchema,
	CurrencyPreviewSchema,
	CurrencySpendRequestSchema,
	convertDenominationAmount,
	getCurrencyDeltaValueInCopper,
	getCurrencyTotalValue,
	getCurrencyValueInCopper,
	InsufficientFundsResponseSchema,
} from "./currency.js";

const balance = { cp: 5, sp: 2, gp: 3, pp: 1 };

describe("currency schemas and conversion helpers", () => {
	it("accepts nonnegative balances and signed deltas", () => {
		expect(CurrencyBalanceSchema.parse({ cp: 0, sp: 2, gp: 3, pp: 4 })).toEqual({
			cp: 0,
			sp: 2,
			gp: 3,
			pp: 4,
		});
		expect(CurrencyDeltaSchema.parse({ cp: -5, sp: 0, gp: 2, pp: -1 })).toEqual({
			cp: -5,
			sp: 0,
			gp: 2,
			pp: -1,
		});
	});

	it("rejects fractional and negative balance values", () => {
		expect(() => CurrencyBalanceSchema.parse({ cp: -1, sp: 0, gp: 0, pp: 0 })).toThrow();
		expect(() => CurrencyBalanceSchema.parse({ cp: 1.5, sp: 0, gp: 0, pp: 0 })).toThrow();
	});

	it("converts denominations using the D&D ten-to-one scale", () => {
		expect(convertDenominationAmount(1, "gp", "sp")).toBe(10);
		expect(convertDenominationAmount(100, "cp", "gp")).toBe(1);
		expect(() => convertDenominationAmount(1, "cp", "gp")).toThrow();
		expect(getCurrencyValueInCopper(balance)).toBe(1_325);
		expect(getCurrencyDeltaValueInCopper({ cp: -5, sp: 1, gp: 0, pp: 1 })).toBe(1_005);
		expect(getCurrencyTotalValue(balance)).toEqual({ copper: 1_325, gp: 13.25 });
	});

	it("requires positive add and spend amounts and distinct conversion denominations", () => {
		expect(() =>
			CurrencyAddRequestSchema.parse({ delta: { cp: 0, sp: 0, gp: 0, pp: 0 } }),
		).toThrow();
		expect(() =>
			CurrencyAddRequestSchema.parse({ delta: { cp: -1, sp: 0, gp: 0, pp: 0 } }),
		).toThrow();
		expect(() =>
			CurrencyAddRequestSchema.parse({ delta: { cp: -1, sp: 0, gp: 1, pp: 0 } }),
		).toThrow();
		expect(() =>
			CurrencySpendRequestSchema.parse({ amount: { denomination: "gp", amount: 0 } }),
		).toThrow();
		expect(() =>
			CurrencyConversionRequestSchema.parse({ from: "gp", to: "gp", amount: 1 }),
		).toThrow();
		expect(() =>
			CurrencyConversionRequestSchema.parse({ from: "cp", to: "gp", amount: 1 }),
		).toThrow();
	});

	it("parses an insufficient-funds error and failed preview as JSON boundaries", () => {
		const error = {
			error: {
				code: "INSUFFICIENT_FUNDS",
				message: "The treasury does not contain enough currency.",
				available: { copper: 50, gp: 0.5 },
				requested: { copper: 100, gp: 1 },
			},
		};
		const preview = {
			operation: "spend",
			previous: balance,
			next: balance,
			delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: { copper: 1_325, gp: 13.25 },
			canApply: false,
			error: error.error,
		};

		expect(InsufficientFundsResponseSchema.parse(error)).toEqual(error);
		expect(CurrencyPreviewSchema.parse(preview)).toEqual(preview);
	});
});
