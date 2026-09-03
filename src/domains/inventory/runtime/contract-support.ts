import { z } from "zod";
import { InventoryCharacterIdSchema, InventoryItemIdSchema } from "../types/index.js";

export const CharacterTreasuryPathParamsSchema = z
	.object({ characterId: InventoryCharacterIdSchema })
	.strict();

export const CharacterHistoryPathParamsSchema = z
	.object({ characterId: InventoryCharacterIdSchema })
	.strict();

export const CharacterItemPathParamsSchema = z
	.object({ characterId: InventoryCharacterIdSchema })
	.strict();

export const CharacterItemDetailPathParamsSchema = z
	.object({ characterId: InventoryCharacterIdSchema, itemId: InventoryItemIdSchema })
	.strict();

export const CharacterItemErrorResponseSchema = z.object({ error: z.string() }).strict();

export const TreasuryErrorResponseSchema = z.object({ error: z.string() }).strict();

export const CharacterHistoryErrorResponseSchema = z.object({ error: z.string() }).strict();

export const inventoryTreasuryTypeImports = [
	{
		kind: "type",
		module: "../domains/inventory/types/index.js",
		names: [
			"AddCharacterTreasuryPreviewRequest",
			"AddCharacterTreasuryRequest",
			"AddCharacterTreasuryPreviewResponse",
			"AddCharacterTreasuryResponse",
			"CharacterTreasuryPreviewResponse",
			"CharacterTreasuryResponse",
			"ConvertCharacterTreasuryRequest",
			"ConvertCharacterTreasuryResponse",
			"SpendCharacterTreasuryPreviewRequest",
			"SpendCharacterTreasuryRequest",
			"SpendCharacterTreasuryPreviewResponse",
			"SpendCharacterTreasuryResponse",
			"TreasuryConflictResponse",
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
