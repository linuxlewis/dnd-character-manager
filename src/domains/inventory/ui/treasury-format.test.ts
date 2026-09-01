import { describe, expect, it } from "vitest";
import { formatTreasuryBalance, formatTreasuryGpValue } from "./treasury-format.js";

describe("treasury formatting", () => {
	it("formats balances and GP totals for player-facing display", () => {
		expect(formatTreasuryBalance({ cp: 5, sp: 4, gp: 3, pp: 1 })).toBe("PP 1 · GP 3 · SP 4 · CP 5");
		expect(formatTreasuryGpValue(13.45)).toBe("13.45");
	});
});
