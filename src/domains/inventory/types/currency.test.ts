import { describe, expect, it } from "vitest";
import {
	CURRENCY_DENOMINATIONS,
	CurrencyAddRequestSchema,
	CurrencyAmountSchema,
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
import { POSTGRES_INTEGER_MAX, POSTGRES_INTEGER_MIN } from "./numeric.js";

const balance = { cp: 5, sp: 2, gp: 3, pp: 1 };

describe("currency schemas and conversion helpers", () => {
	it("enforces PostgreSQL integer bounds for persisted currency values", () => {
		const maxBalance = {
			cp: POSTGRES_INTEGER_MAX,
			sp: POSTGRES_INTEGER_MAX,
			gp: POSTGRES_INTEGER_MAX,
			pp: POSTGRES_INTEGER_MAX,
		};
		const minDelta = { cp: POSTGRES_INTEGER_MIN, sp: 0, gp: 0, pp: 0 };

		expect(CurrencyBalanceSchema.parse(maxBalance)).toEqual(maxBalance);
		expect(
			CurrencyDeltaSchema.parse({
				cp: POSTGRES_INTEGER_MIN,
				sp: POSTGRES_INTEGER_MAX,
				gp: 0,
				pp: 0,
			}),
		).toEqual({
			cp: POSTGRES_INTEGER_MIN,
			sp: POSTGRES_INTEGER_MAX,
			gp: 0,
			pp: 0,
		});
		expect(CurrencyDeltaSchema.parse({ cp: POSTGRES_INTEGER_MAX, sp: 0, gp: 0, pp: 0 })).toEqual({
			cp: POSTGRES_INTEGER_MAX,
			sp: 0,
			gp: 0,
			pp: 0,
		});
		expect(() =>
			CurrencyBalanceSchema.parse({ ...maxBalance, cp: POSTGRES_INTEGER_MAX + 1 }),
		).toThrow();
		expect(() =>
			CurrencyDeltaSchema.parse({ ...minDelta, cp: POSTGRES_INTEGER_MIN - 1 }),
		).toThrow();
		expect(() =>
			CurrencyDeltaSchema.parse({ ...minDelta, cp: POSTGRES_INTEGER_MAX + 1 }),
		).toThrow();
		expect(
			CurrencyAmountSchema.parse({ denomination: "cp", amount: POSTGRES_INTEGER_MAX }),
		).toEqual({ denomination: "cp", amount: POSTGRES_INTEGER_MAX });
		expect(() =>
			CurrencyAmountSchema.parse({ denomination: "cp", amount: POSTGRES_INTEGER_MAX + 1 }),
		).toThrow();
		expect(
			CurrencySpendRequestSchema.parse({
				amount: { denomination: "cp", amount: POSTGRES_INTEGER_MAX },
			}),
		).toEqual({
			amount: { denomination: "cp", amount: POSTGRES_INTEGER_MAX },
		});
		expect(() =>
			CurrencySpendRequestSchema.parse({
				amount: { denomination: "cp", amount: POSTGRES_INTEGER_MAX + 1 },
			}),
		).toThrow();
		expect(
			CurrencyConversionRequestSchema.parse({
				from: "pp",
				to: "cp",
				amount: POSTGRES_INTEGER_MAX,
			}),
		).toEqual({ from: "pp", to: "cp", amount: POSTGRES_INTEGER_MAX });
		expect(() =>
			CurrencyConversionRequestSchema.parse({
				from: "pp",
				to: "cp",
				amount: POSTGRES_INTEGER_MAX + 1,
			}),
		).toThrow();
	});

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

	it("keeps maximum-denomination sums and conversion outputs safe", () => {
		const maxBalance = {
			cp: POSTGRES_INTEGER_MAX,
			sp: POSTGRES_INTEGER_MAX,
			gp: POSTGRES_INTEGER_MAX,
			pp: POSTGRES_INTEGER_MAX,
		};
		const expectedCopper = POSTGRES_INTEGER_MAX * (1 + 10 + 100 + 1_000);
		const mixedDelta = {
			cp: POSTGRES_INTEGER_MIN,
			sp: POSTGRES_INTEGER_MAX,
			gp: POSTGRES_INTEGER_MAX,
			pp: POSTGRES_INTEGER_MAX,
		};

		expect(CURRENCY_DENOMINATIONS).toEqual(["cp", "sp", "gp", "pp"]);
		expect(Number.isSafeInteger(expectedCopper)).toBe(true);
		expect(getCurrencyValueInCopper(maxBalance)).toBe(expectedCopper);
		expect(getCurrencyTotalValue(maxBalance)).toEqual({
			copper: expectedCopper,
			gp: expectedCopper / 100,
		});
		expect(Number.isSafeInteger(getCurrencyDeltaValueInCopper(mixedDelta))).toBe(true);

		const convertedCopper = convertDenominationAmount(POSTGRES_INTEGER_MAX, "pp", "cp");
		expect(Number.isSafeInteger(convertedCopper)).toBe(true);
		expect(convertedCopper).toBe(POSTGRES_INTEGER_MAX * 1_000);
		expect(convertedCopper).toBeLessThan(Number.MAX_SAFE_INTEGER);
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
