import { describe, expect, it } from "vitest";
import {
	CURRENCY_DENOMINATIONS,
	type CurrencyBalance,
	DND_CURRENCY_TO_COPPER,
	getCurrencyValueInCopper,
} from "../types/index.js";
import { planAdd, planConversion, planSpend } from "./currency-operations.js";
import {
	InsufficientDenominationError,
	InsufficientFundsError,
	TreasuryOverflowError,
} from "./index.js";

const exactPaymentCases = [
	{
		name: "mixed copper and silver coins",
		balance: { cp: 1, sp: 2, gp: 0, pp: 0 },
		amount: { denomination: "cp" as const, amount: 11 },
		next: { cp: 0, sp: 1, gp: 0, pp: 0 },
	},
	{
		name: "mixed silver and gold coins",
		balance: { cp: 5, sp: 9, gp: 1, pp: 0 },
		amount: { denomination: "sp" as const, amount: 15 },
		next: { cp: 5, sp: 4, gp: 0, pp: 0 },
	},
	{
		name: "lower denominations",
		balance: { cp: 0, sp: 15, gp: 0, pp: 0 },
		amount: { denomination: "gp" as const, amount: 1 },
		next: { cp: 0, sp: 5, gp: 0, pp: 0 },
	},
	{
		name: "a higher denomination",
		balance: { cp: 0, sp: 0, gp: 0, pp: 1 },
		amount: { denomination: "gp" as const, amount: 10 },
		next: { cp: 0, sp: 0, gp: 0, pp: 0 },
	},
] as const;

const exactSmallBalanceCases = createExactSmallBalanceCases();
const conservationSmallBalanceCases = createConservationSmallBalanceCases();

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

	it.each(exactPaymentCases)("prefers an exact payment: $name", ({ balance, amount, next }) => {
		const plan = planSpend(balance, { amount });
		expect(plan.next).toEqual(next);
		expect(plan.change).toBeUndefined();
		expect(getCurrencyValueInCopper(plan.next) + currencyAmountValue(amount)).toBe(
			getCurrencyValueInCopper(balance),
		);
	});

	it.each(exactSmallBalanceCases)("finds an exact payment for every small balance: $name", ({
		balance,
		amount,
	}) => {
		const plan = planSpend(balance, { amount });
		expect(plan.change).toBeUndefined();
		expect(getCurrencyValueInCopper(plan.next) + currencyAmountValue(amount)).toBe(
			getCurrencyValueInCopper(balance),
		);
		expect(Object.values(plan.next).every((value) => value >= 0)).toBe(true);
	});

	it.each(conservationSmallBalanceCases)("conserves value for a small balance: $name", ({
		balance,
		amount,
	}) => {
		const plan = planSpend(balance, { amount });
		const changeValue = plan.change ? getCurrencyValueInCopper(plan.change) : 0;
		expect(getCurrencyValueInCopper(plan.next) + currencyAmountValue(amount)).toBe(
			getCurrencyValueInCopper(balance),
		);
		expect(changeValue).toBeGreaterThanOrEqual(0);
		expect(Object.values(plan.next).every((value) => value >= 0)).toBe(true);
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

function createExactSmallBalanceCases() {
	return createSmallSpendCases().filter(({ balance, amount }) =>
		hasExactPayment(balance, currencyAmountValue(amount)),
	);
}

function createConservationSmallBalanceCases() {
	return createSmallSpendCases().filter(({ balance, amount }) => {
		const denominationIndex = CURRENCY_DENOMINATIONS.indexOf(amount.denomination);
		const hasHigherCoin = CURRENCY_DENOMINATIONS.slice(denominationIndex + 1).some(
			(denomination) => balance[denomination] > 0,
		);
		return hasExactPayment(balance, currencyAmountValue(amount)) || hasHigherCoin;
	});
}

function createSmallSpendCases() {
	const cases = [];
	for (let cp = 0; cp <= 2; cp += 1) {
		for (let sp = 0; sp <= 2; sp += 1) {
			for (let gp = 0; gp <= 2; gp += 1) {
				for (let pp = 0; pp <= 2; pp += 1) {
					const balance = { cp, sp, gp, pp };
					const total = getCurrencyValueInCopper(balance);
					for (const denomination of CURRENCY_DENOMINATIONS) {
						const value = DND_CURRENCY_TO_COPPER[denomination];
						const maximumAmount = Math.min(4, Math.floor(total / value));
						for (let amount = 1; amount <= maximumAmount; amount += 1) {
							cases.push({
								name: `${JSON.stringify(balance)} pays ${amount} ${denomination}`,
								balance,
								amount: { denomination, amount },
							});
						}
					}
				}
			}
		}
	}
	return cases;
}

function hasExactPayment(balance: CurrencyBalance, requestedCopper: number) {
	for (let pp = 0; pp <= balance.pp; pp += 1) {
		for (let gp = 0; gp <= balance.gp; gp += 1) {
			for (let sp = 0; sp <= balance.sp; sp += 1) {
				for (let cp = 0; cp <= balance.cp; cp += 1) {
					if (cp + sp * 10 + gp * 100 + pp * 1_000 === requestedCopper) return true;
				}
			}
		}
	}
	return false;
}

function currencyAmountValue(amount: {
	denomination: keyof typeof DND_CURRENCY_TO_COPPER;
	amount: number;
}) {
	return amount.amount * DND_CURRENCY_TO_COPPER[amount.denomination];
}
