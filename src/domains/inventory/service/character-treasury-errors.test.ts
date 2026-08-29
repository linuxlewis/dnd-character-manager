import { describe, expect, it } from "vitest";
import {
	InsufficientDenominationError,
	InsufficientFundsError,
	TreasuryOverflowError,
} from "./character-treasury-errors.js";

describe("character treasury errors", () => {
	it("exposes stable typed details for insufficient funds", () => {
		const error = new InsufficientFundsError({
			message: "The treasury does not contain enough currency.",
			available: { copper: 5, gp: 0.05 },
			requested: { copper: 100, gp: 1 },
		});

		expect(error.code).toBe("INSUFFICIENT_FUNDS");
		expect(error.details).toEqual({
			code: "INSUFFICIENT_FUNDS",
			message: "The treasury does not contain enough currency.",
			available: { copper: 5, gp: 0.05 },
			requested: { copper: 100, gp: 1 },
		});
	});

	it("identifies denomination shortages and balance overflow", () => {
		const denominationError = new InsufficientDenominationError("gp", 2, 1);

		expect(denominationError.details).toEqual({
			code: "INSUFFICIENT_DENOMINATION",
			message: "The treasury does not contain enough GP coins to convert.",
			denomination: "gp",
			available: 1,
			requested: 2,
		});
		expect(new TreasuryOverflowError()).toBeInstanceOf(Error);
	});
});
