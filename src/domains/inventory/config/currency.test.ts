import { describe, expect, it } from "vitest";
import { CURRENCY_DENOMINATIONS, DND_CURRENCY_TO_COPPER } from "../types/currency.js";
import { POSTGRES_INTEGER_MAX, POSTGRES_INTEGER_MIN } from "../types/numeric.js";
import {
	convertDenominationAmount,
	getCurrencyDeltaValueInCopper,
	getCurrencyTotalValue,
	getCurrencyValueInCopper,
} from "./currency.js";

const balance = { cp: 5, sp: 2, gp: 3, pp: 1 };
describe("currency calculations", () => {
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

	it("rejects conversions exceeding the target integer range", () => {
		expect(() =>
			convertDenominationAmount(
				Math.floor(POSTGRES_INTEGER_MAX / DND_CURRENCY_TO_COPPER.pp) + 1,
				"pp",
				"cp",
			),
		).toThrow();
	});
});
