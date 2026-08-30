import { describe, expect, expectTypeOf, it } from "vitest";
import type {
	TreasuryAddPreview,
	TreasuryAddRequest,
	TreasuryBalance,
	TreasuryData,
	TreasuryPreview,
	TreasurySpendPreview,
	TreasurySpendRequest,
} from "./treasury-types.js";
import { createTreasuryNeutralPreview, treasuryBalancesEqual } from "./treasury-types.js";

describe("owner-neutral treasury UI types", () => {
	it("share only balances, previews, and operation payloads", () => {
		expectTypeOf<TreasuryData>().toMatchTypeOf<{
			balances: TreasuryBalance;
			totalValue: { copper: number; gp: number };
		}>();
		expectTypeOf<TreasuryAddRequest>().toMatchTypeOf<{ delta: TreasuryBalance }>();
		expectTypeOf<TreasurySpendRequest>().toMatchTypeOf<{
			amount: { denomination: string; amount: number };
		}>();
		expectTypeOf<TreasuryAddPreview>().toMatchTypeOf<TreasuryPreview>();
		expectTypeOf<TreasurySpendPreview>().toMatchTypeOf<TreasuryPreview>();
	});

	it("compares every denomination for authoritative preview freshness", () => {
		const balance = { cp: 1, sp: 2, gp: 3, pp: 4 };
		expect(treasuryBalancesEqual(balance, { ...balance })).toBe(true);
		expect(treasuryBalancesEqual(balance, { ...balance, cp: 0 })).toBe(false);
		expect(treasuryBalancesEqual(balance, { ...balance, sp: 0 })).toBe(false);
		expect(treasuryBalancesEqual(balance, { ...balance, gp: 0 })).toBe(false);
		expect(treasuryBalancesEqual(balance, { ...balance, pp: 0 })).toBe(false);
	});

	it("creates a no-op preview without invoking currency planning", () => {
		const treasury = {
			balances: { cp: 5, sp: 4, gp: 3, pp: 1 },
			totalValue: { copper: 1_345, gp: 13.45 },
		};

		expect(createTreasuryNeutralPreview(treasury, "add")).toEqual({
			operation: "add",
			previous: treasury.balances,
			next: treasury.balances,
			delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: treasury.totalValue,
			canApply: false,
		});
		expect(createTreasuryNeutralPreview(treasury, "spend")).toEqual({
			operation: "spend",
			previous: treasury.balances,
			next: treasury.balances,
			delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: treasury.totalValue,
			canApply: false,
		});
	});
});
