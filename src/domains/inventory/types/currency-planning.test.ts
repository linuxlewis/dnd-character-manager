import { describe, expect, it } from "vitest";
import { calculateSpend, planAdd } from "./currency-planning.js";

describe("shared currency planning", () => {
	it("plans add operations without changing entered denominations", () => {
		expect(
			planAdd({ cp: 5, sp: 4, gp: 3, pp: 1 }, { delta: { cp: 2, sp: 3, gp: 4, pp: 5 } }),
		).toEqual({
			previous: { cp: 5, sp: 4, gp: 3, pp: 1 },
			next: { cp: 7, sp: 7, gp: 7, pp: 6 },
			delta: { cp: 2, sp: 3, gp: 4, pp: 5 },
		});
		expect(
			planAdd({ cp: 0, sp: 0, gp: 0, pp: 0 }, { delta: { cp: 100, sp: 0, gp: 0, pp: 0 } }).next,
		).toEqual({ cp: 100, sp: 0, gp: 0, pp: 0 });
	});

	it.each([
		[
			"100 copper minus 1 copper",
			{ cp: 100, sp: 0, gp: 0, pp: 0 },
			{ denomination: "cp" as const, amount: 1 },
			{ cp: 9, sp: 9, gp: 0, pp: 0 },
		],
		[
			"100 gold minus 30 gold",
			{ cp: 0, sp: 0, gp: 100, pp: 0 },
			{ denomination: "gp" as const, amount: 30 },
			{ cp: 0, sp: 0, gp: 0, pp: 7 },
		],
		[
			"1 gold minus 1 copper",
			{ cp: 0, sp: 0, gp: 1, pp: 0 },
			{ denomination: "cp" as const, amount: 1 },
			{ cp: 9, sp: 9, gp: 0, pp: 0 },
		],
		[
			"mixed denominations",
			{ cp: 7, sp: 18, gp: 6, pp: 2 },
			{ denomination: "sp" as const, amount: 13 },
			{ cp: 7, sp: 5, gp: 6, pp: 2 },
		],
	] as const)("normalizes the entire remaining balance for %s", (_name, previous, amount, next) => {
		const result = calculateSpend(previous, { amount });

		expect(result).toEqual({
			ok: true,
			plan: {
				previous,
				next,
				delta: {
					cp: next.cp - previous.cp,
					sp: next.sp - previous.sp,
					gp: next.gp - previous.gp,
					pp: next.pp - previous.pp,
				},
			},
		});
	});

	it("returns a client-displayable insufficient-funds result without changing balances", () => {
		const result = calculateSpend(
			{ cp: 5, sp: 4, gp: 3, pp: 1 },
			{ amount: { denomination: "gp", amount: 100 } },
		);

		expect(result).toEqual({
			ok: false,
			previous: { cp: 5, sp: 4, gp: 3, pp: 1 },
			next: { cp: 5, sp: 4, gp: 3, pp: 1 },
			delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: { copper: 1_345, gp: 13.45 },
			error: {
				code: "INSUFFICIENT_FUNDS",
				message: "The treasury does not contain enough currency.",
				available: { copper: 1_345, gp: 13.45 },
				requested: { copper: 10_000, gp: 100 },
			},
		});
	});
});
