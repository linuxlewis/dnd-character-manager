import { z } from "zod";
import { InventoryCharacterIdSchema } from "../types/index.js";

export const CharacterTreasuryPathParamsSchema = z
	.object({ characterId: InventoryCharacterIdSchema })
	.strict();

export const TreasuryErrorResponseSchema = z.object({ error: z.string() }).strict();

export const inventoryTreasuryTypeImports = [
	{
		kind: "type",
		module: "../domains/inventory/types/index.js",
		names: [
			"AddCharacterTreasuryRequest",
			"AddCharacterTreasuryPreviewResponse",
			"AddCharacterTreasuryResponse",
			"CharacterTreasuryPreviewResponse",
			"CharacterTreasuryResponse",
			"ConvertCharacterTreasuryRequest",
			"ConvertCharacterTreasuryResponse",
			"SpendCharacterTreasuryRequest",
			"SpendCharacterTreasuryPreviewResponse",
			"SpendCharacterTreasuryResponse",
		],
	},
] as const;

export const inventoryTreasurySchemaImports = [
	{
		kind: "value",
		module: "../domains/inventory/types/index.js",
		names: [
			"AddCharacterTreasuryResponseSchema",
			"AddCharacterTreasuryPreviewResponseSchema",
			"CharacterTreasuryResponseSchema",
			"ConvertCharacterTreasuryResponseSchema",
			"InsufficientDenominationResponseSchema",
			"InsufficientFundsResponseSchema",
			"SpendCharacterTreasuryResponseSchema",
			"SpendCharacterTreasuryPreviewResponseSchema",
		],
	},
] as const;
