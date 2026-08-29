import { describe, expect, it } from "vitest";
import {
	CharacterTreasuryPathParamsSchema,
	inventoryTreasurySchemaImports,
	inventoryTreasuryTypeImports,
	TreasuryErrorResponseSchema,
} from "./contract-support.js";

describe("inventory treasury contract support", () => {
	it("validates UUID path parameters and error responses", () => {
		expect(
			CharacterTreasuryPathParamsSchema.parse({
				characterId: "00000000-0000-4000-8000-000000000001",
			}),
		).toEqual({ characterId: "00000000-0000-4000-8000-000000000001" });
		expect(() => CharacterTreasuryPathParamsSchema.parse({ characterId: "not-a-uuid" })).toThrow();
		expect(TreasuryErrorResponseSchema.parse({ error: "Character not found." })).toEqual({
			error: "Character not found.",
		});
	});

	it("declares generated inventory type and schema imports", () => {
		expect(inventoryTreasuryTypeImports[0].names).toContain("SpendCharacterTreasuryRequest");
		expect(inventoryTreasurySchemaImports[0].names).toContain("CharacterTreasuryResponseSchema");
		expect(inventoryTreasurySchemaImports[0].names).toContain("InsufficientFundsResponseSchema");
	});
});
