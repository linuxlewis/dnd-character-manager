import { describe, expect, it } from "vitest";
import { planAdd, planConversion, planSpend } from "./currency-operations.js";
import {
	InsufficientDenominationError,
	InsufficientFundsError,
	TreasuryOverflowError,
} from "./index.js";

describe("character treasury currency operations", () => {
	it("adds mixed denominations and rejects a PostgreSQL balance overflow", () => {
		expect(
			planAdd({ cp: 1, sp: 2, gp: 3, pp: 4 }, { delta: { cp: 5, sp: 6, gp: 7, pp: 8 } }),
		).toEqual({
			previous: { cp: 1, sp: 2, gp: 3, pp: 4 },
			next: { cp: 6, sp: 8, gp: 10, pp: 12 },
			delta: { cp: 5, sp: 6, gp: 7, pp: 8 },
		});
		expect(() =>
			planAdd(
				{ cp: 2_147_483_647, sp: 0, gp: 0, pp: 0 },
				{ delta: { cp: 1, sp: 0, gp: 0, pp: 0 } },
			),
		).toThrow(TreasuryOverflowError);
	});

	it("spends an exact requested denomination and exact lower-denomination value", () => {
		expect(
			planSpend({ cp: 0, sp: 0, gp: 2, pp: 0 }, { amount: { denomination: "gp", amount: 1 } }),
		).toEqual({
			previous: { cp: 0, sp: 0, gp: 2, pp: 0 },
			next: { cp: 0, sp: 0, gp: 1, pp: 0 },
			delta: { cp: 0, sp: 0, gp: -1, pp: 0 },
		});
		expect(
			planSpend({ cp: 0, sp: 15, gp: 0, pp: 0 }, { amount: { denomination: "gp", amount: 1 } }),
		).toEqual({
			previous: { cp: 0, sp: 15, gp: 0, pp: 0 },
			next: { cp: 0, sp: 5, gp: 0, pp: 0 },
			delta: { cp: 0, sp: -10, gp: 0, pp: 0 },
		});
	});

	it("makes deterministic change from higher denominations", () => {
		expect(
			planSpend({ cp: 0, sp: 0, gp: 1, pp: 0 }, { amount: { denomination: "sp", amount: 5 } }),
		).toEqual({
			previous: { cp: 0, sp: 0, gp: 1, pp: 0 },
			next: { cp: 0, sp: 5, gp: 0, pp: 0 },
			delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
			change: { cp: 0, sp: 5, gp: 0, pp: 0 },
		});
		expect(
			planSpend({ cp: 0, sp: 0, gp: 0, pp: 1 }, { amount: { denomination: "gp", amount: 6 } }),
		).toEqual({
			previous: { cp: 0, sp: 0, gp: 0, pp: 1 },
			next: { cp: 0, sp: 0, gp: 4, pp: 0 },
			delta: { cp: 0, sp: 0, gp: 4, pp: -1 },
			change: { cp: 0, sp: 0, gp: 4, pp: 0 },
		});
		expect(
			planSpend({ cp: 5, sp: 9, gp: 1, pp: 0 }, { amount: { denomination: "sp", amount: 15 } }),
		).toEqual({
			previous: { cp: 5, sp: 9, gp: 1, pp: 0 },
			next: { cp: 5, sp: 4, gp: 0, pp: 0 },
			delta: { cp: 0, sp: -5, gp: -1, pp: 0 },
			change: { cp: 5, sp: 4, gp: 0, pp: 0 },
		});
	});

	it("rejects insufficient total value without producing a negative balance", () => {
		expect(() =>
			planSpend({ cp: 9, sp: 0, gp: 0, pp: 0 }, { amount: { denomination: "sp", amount: 1 } }),
		).toThrow(InsufficientFundsError);
	});

	it("converts exact denominations and checks source and target boundaries", () => {
		expect(
			planConversion({ cp: 0, sp: 0, gp: 0, pp: 2 }, { from: "pp", to: "gp", amount: 1 }),
		).toEqual({
			previous: { cp: 0, sp: 0, gp: 0, pp: 2 },
			next: { cp: 0, sp: 0, gp: 10, pp: 1 },
			delta: { cp: 0, sp: 0, gp: 10, pp: -1 },
			from: "pp",
			to: "gp",
			amount: 1,
			convertedAmount: 10,
		});
		expect(() =>
			planConversion({ cp: 0, sp: 0, gp: 1, pp: 0 }, { from: "pp", to: "gp", amount: 1 }),
		).toThrow(InsufficientDenominationError);
		expect(() =>
			planConversion(
				{ cp: 100, sp: 0, gp: 2_147_483_647, pp: 0 },
				{ from: "cp", to: "gp", amount: 100 },
			),
		).toThrow(TreasuryOverflowError);
	});
});
