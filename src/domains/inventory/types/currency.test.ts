import { describe, expect, it } from "vitest";
import {
	CURRENCY_DENOMINATIONS,
	CurrencyAddRequestSchema,
	CurrencyAmountSchema,
	CurrencyApplyDeltaRequestSchema,
	CurrencyBalanceSchema,
	CurrencyConversionRequestSchema,
	CurrencyConversionResponseSchema,
	CurrencyDeltaSchema,
	CurrencyNoteSchema,
	CurrencyPreviewSchema,
	CurrencySpendRequestSchema,
	convertDenominationAmount,
	DND_CURRENCY_TO_COPPER,
	getCurrencyDeltaValueInCopper,
	getCurrencyTotalValue,
	getCurrencyValueInCopper,
	InsufficientFundsResponseSchema,
	TreasuryConflictResponseSchema,
	TreasurySpendErrorResponseSchema,
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

	it("normalizes optional currency notes at the boundary", () => {
		expect(CurrencyNoteSchema.parse("  Reward from the guild  ")).toBe("Reward from the guild");
		expect(CurrencyNoteSchema.parse(" \t")).toBeNull();
		expect(CurrencyNoteSchema.parse(null)).toBeNull();
		expect(() => CurrencyNoteSchema.parse("n".repeat(501))).toThrow();
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

		const largestPpToCpAmount = Math.floor(POSTGRES_INTEGER_MAX / DND_CURRENCY_TO_COPPER.pp);
		const convertedCopper = convertDenominationAmount(largestPpToCpAmount, "pp", "cp");
		expect(Number.isSafeInteger(convertedCopper)).toBe(true);
		expect(convertedCopper).toBe(largestPpToCpAmount * DND_CURRENCY_TO_COPPER.pp);
		expect(convertedCopper).toBeLessThan(Number.MAX_SAFE_INTEGER);
	});

	it("keeps converted target balances inside the PostgreSQL integer range", () => {
		const largestPpToCpAmount = Math.floor(POSTGRES_INTEGER_MAX / DND_CURRENCY_TO_COPPER.pp);
		const firstOverflowingPpToCpAmount = largestPpToCpAmount + 1;
		const largestConvertedAmount = largestPpToCpAmount * DND_CURRENCY_TO_COPPER.pp;

		expect(
			CurrencyConversionRequestSchema.parse({
				from: "pp",
				to: "cp",
				amount: largestPpToCpAmount,
			}),
		).toEqual({ from: "pp", to: "cp", amount: largestPpToCpAmount });
		expect(convertDenominationAmount(largestPpToCpAmount, "pp", "cp")).toBe(largestConvertedAmount);
		const conversionResponse = {
			operation: "convert" as const,
			previous: { cp: 0, sp: 0, gp: 0, pp: largestPpToCpAmount },
			next: { cp: largestConvertedAmount, sp: 0, gp: 0, pp: 0 },
			delta: { cp: largestConvertedAmount, sp: 0, gp: 0, pp: -largestPpToCpAmount },
			totalValue: { copper: largestConvertedAmount, gp: largestConvertedAmount / 100 },
			from: "pp" as const,
			to: "cp" as const,
			amount: largestPpToCpAmount,
			convertedAmount: largestConvertedAmount,
		};
		expect(CurrencyConversionResponseSchema.parse(conversionResponse)).toEqual(conversionResponse);
		expect(() =>
			CurrencyConversionResponseSchema.parse({
				...conversionResponse,
				convertedAmount: POSTGRES_INTEGER_MAX + 1,
			}),
		).toThrow();
		expect(() =>
			CurrencyConversionRequestSchema.parse({
				from: "pp",
				to: "cp",
				amount: firstOverflowingPpToCpAmount,
			}),
		).toThrow();
		expect(() => convertDenominationAmount(firstOverflowingPpToCpAmount, "pp", "cp")).toThrow();
	});

	it("rejects unknown keys in nested currency boundary objects", () => {
		const result = CurrencyApplyDeltaRequestSchema.safeParse({
			delta: { cp: 0, sp: 0, gp: 0, pp: 0, ep: 1 },
		});

		expect(result.success).toBe(false);
		expect(
			CurrencyAddRequestSchema.safeParse({
				delta: { cp: 1, sp: 0, gp: 0, pp: 0, ep: 1 },
			}).success,
		).toBe(false);
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

	it("parses stale-preview conflicts and the combined spend error boundary", () => {
		const conflict = {
			error: {
				code: "TREASURY_CONFLICT",
				message: "The character treasury changed after the operation was previewed.",
				expectedPrevious: balance,
				actualPrevious: { ...balance, cp: balance.cp + 1 },
			},
		};

		expect(TreasuryConflictResponseSchema.parse(conflict)).toEqual(conflict);
		expect(TreasurySpendErrorResponseSchema.parse(conflict)).toEqual(conflict);
	});

	it("accepts optional returned change and preserves previews without it", () => {
		const basePreview = {
			previous: { cp: 0, sp: 0, gp: 1, pp: 0 },
			next: { cp: 0, sp: 5, gp: 0, pp: 0 },
			delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
			totalValue: { copper: 50, gp: 0.5 },
			canApply: true,
		};
		const change = { cp: 0, sp: 5, gp: 0, pp: 0 };

		expect(CurrencyPreviewSchema.parse({ operation: "spend", ...basePreview, change })).toEqual({
			operation: "spend",
			...basePreview,
			change,
		});
		expect(
			CurrencyPreviewSchema.parse({
				operation: "add",
				...basePreview,
				next: basePreview.previous,
				delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
				totalValue: { copper: 100, gp: 1 },
			}),
		).not.toHaveProperty("change");
	});
});
