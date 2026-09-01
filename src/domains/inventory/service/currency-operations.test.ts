import { describe, expect, it } from "vitest";
import { getCurrencyValueInCopper } from "../types/index.js";
import { planAdd, planConversion, planSpend } from "./currency-operations.js";
import {
	InsufficientDenominationError,
	InsufficientFundsError,
	TreasuryOverflowError,
} from "./index.js";

const legacyNormalizationCases = [
	{
		name: "100 copper minus 1 copper",
		balance: { cp: 100, sp: 0, gp: 0, pp: 0 },
		amount: { denomination: "cp" as const, amount: 1 },
		next: { cp: 9, sp: 9, gp: 0, pp: 0 },
	},
	{
		name: "100 gold minus 30 gold",
		balance: { cp: 0, sp: 0, gp: 100, pp: 0 },
		amount: { denomination: "gp" as const, amount: 30 },
		next: { cp: 0, sp: 0, gp: 0, pp: 7 },
	},
	{
		name: "1 gold minus 1 copper",
		balance: { cp: 0, sp: 0, gp: 1, pp: 0 },
		amount: { denomination: "cp" as const, amount: 1 },
		next: { cp: 9, sp: 9, gp: 0, pp: 0 },
	},
	{
		name: "a mixed balance",
		balance: { cp: 7, sp: 18, gp: 6, pp: 2 },
		amount: { denomination: "sp" as const, amount: 13 },
		next: { cp: 7, sp: 5, gp: 6, pp: 2 },
	},
] as const;

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

	it.each(legacyNormalizationCases)("normalizes the entire remaining balance: $name", ({
		balance,
		amount,
		next,
	}) => {
		const plan = planSpend(balance, { amount });
		expect(plan.next).toEqual(next);
		expect(plan.change).toBeUndefined();
		expect(getCurrencyValueInCopper(plan.next) + currencyAmountValue(amount)).toBe(
			getCurrencyValueInCopper(balance),
		);
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

function currencyAmountValue(amount: { denomination: "cp" | "sp" | "gp" | "pp"; amount: number }) {
	return amount.amount * { cp: 1, sp: 10, gp: 100, pp: 1_000 }[amount.denomination];
}
