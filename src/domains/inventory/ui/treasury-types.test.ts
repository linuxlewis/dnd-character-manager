import { describe, expectTypeOf, it } from "vitest";
import type {
	TreasuryAddPreview,
	TreasuryAddRequest,
	TreasuryBalance,
	TreasuryData,
	TreasuryPreview,
	TreasurySpendPreview,
	TreasurySpendRequest,
} from "./treasury-types.js";

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
});
