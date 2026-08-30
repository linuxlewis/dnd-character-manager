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
	});

	it("plans spend operations with the server's making-change algorithm", () => {
		const result = calculateSpend(
			{ cp: 5, sp: 4, gp: 3, pp: 1 },
			{ amount: { denomination: "sp", amount: 5 } },
		);

		expect(result).toEqual({
			ok: true,
			plan: {
				previous: { cp: 5, sp: 4, gp: 3, pp: 1 },
				next: { cp: 5, sp: 9, gp: 2, pp: 1 },
				delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
				change: { cp: 0, sp: 5, gp: 0, pp: 0 },
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
