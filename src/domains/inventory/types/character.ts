import { z } from "zod";
import {
	CurrencyAddRequestSchema,
	CurrencyAddResponseSchema,
	CurrencyApplyDeltaRequestSchema,
	CurrencyBalanceSchema,
	CurrencyConversionRequestSchema,
	CurrencyConversionResponseSchema,
	CurrencyMutationResponseSchema,
	CurrencyPreviewSchema,
	CurrencySpendRequestSchema,
	CurrencySpendResponseSchema,
	CurrencyTotalValueSchema,
} from "./currency.js";
import {
	CatalogueItemIdSchema,
	InventoryCharacterIdSchema,
	InventoryScopeIdSchema,
} from "./ids.js";
import {
	CharacterItemFilterSchema,
	InventoryItemBaseSchema,
	InventoryItemSchema,
	JsonObjectSchema,
} from "./item.js";
import { PositivePostgresIntegerSchema } from "./numeric.js";

export const CharacterTreasurySchema = z
	.object({
		characterId: InventoryCharacterIdSchema,
		inventoryScopeId: InventoryScopeIdSchema,
		balances: CurrencyBalanceSchema,
		totalValue: CurrencyTotalValueSchema,
	})
	.strict();
export type CharacterTreasury = z.infer<typeof CharacterTreasurySchema>;

export const CharacterTreasuryResponseSchema = z
	.object({
		treasury: CharacterTreasurySchema,
	})
	.strict();
export type CharacterTreasuryResponse = z.infer<typeof CharacterTreasuryResponseSchema>;

export const UpdateCharacterTreasuryRequestSchema = CurrencyApplyDeltaRequestSchema;
export type UpdateCharacterTreasuryRequest = z.infer<typeof UpdateCharacterTreasuryRequestSchema>;

export const AddCharacterTreasuryRequestSchema = CurrencyAddRequestSchema;
export type AddCharacterTreasuryRequest = z.infer<typeof AddCharacterTreasuryRequestSchema>;

export const SpendCharacterTreasuryRequestSchema = CurrencySpendRequestSchema;
export type SpendCharacterTreasuryRequest = z.infer<typeof SpendCharacterTreasuryRequestSchema>;

export const ConvertCharacterTreasuryRequestSchema = CurrencyConversionRequestSchema;
export type ConvertCharacterTreasuryRequest = z.infer<typeof ConvertCharacterTreasuryRequestSchema>;

export const CharacterTreasuryMutationResponseSchema = z
	.object({
		treasury: CharacterTreasurySchema,
		change: CurrencyMutationResponseSchema,
	})
	.strict();
export type CharacterTreasuryMutationResponse = z.infer<
	typeof CharacterTreasuryMutationResponseSchema
>;

export const AddCharacterTreasuryResponseSchema = z
	.object({
		treasury: CharacterTreasurySchema,
		change: CurrencyAddResponseSchema,
	})
	.strict();
export type AddCharacterTreasuryResponse = z.infer<typeof AddCharacterTreasuryResponseSchema>;

export const SpendCharacterTreasuryResponseSchema = z
	.object({
		treasury: CharacterTreasurySchema,
		change: CurrencySpendResponseSchema,
	})
	.strict();
export type SpendCharacterTreasuryResponse = z.infer<typeof SpendCharacterTreasuryResponseSchema>;

export const ConvertCharacterTreasuryResponseSchema = z
	.object({
		treasury: CharacterTreasurySchema,
		change: CurrencyConversionResponseSchema,
	})
	.strict();
export type ConvertCharacterTreasuryResponse = z.infer<
	typeof ConvertCharacterTreasuryResponseSchema
>;

export const CharacterTreasuryPreviewResponseSchema = z
	.object({
		treasury: CharacterTreasurySchema,
		preview: CurrencyPreviewSchema,
	})
	.strict();
export type CharacterTreasuryPreviewResponse = z.infer<
	typeof CharacterTreasuryPreviewResponseSchema
>;

export const CreateCharacterItemRequestSchema = InventoryItemBaseSchema.extend({
	catalogueItemId: CatalogueItemIdSchema.nullable().optional(),
}).strict();
export type CreateCharacterItemRequest = z.infer<typeof CreateCharacterItemRequestSchema>;

export const UpdateCharacterItemRequestSchema = CreateCharacterItemRequestSchema.partial()
	.extend({
		quantity: PositivePostgresIntegerSchema.optional(),
		properties: JsonObjectSchema.optional(),
	})
	.strict()
	.refine(hasAtLeastOneItemField, {
		message: "An item update must include at least one field.",
	});
export type UpdateCharacterItemRequest = z.infer<typeof UpdateCharacterItemRequestSchema>;

export const CharacterItemResponseSchema = z
	.object({
		item: InventoryItemSchema,
	})
	.strict();
export type CharacterItemResponse = z.infer<typeof CharacterItemResponseSchema>;

export const ListCharacterItemsRequestSchema = CharacterItemFilterSchema;
export type ListCharacterItemsRequest = z.infer<typeof ListCharacterItemsRequestSchema>;

export const ListCharacterItemsResponseSchema = z
	.object({
		items: z.array(InventoryItemSchema),
		total: z.number().int().nonnegative(),
	})
	.strict();
export type ListCharacterItemsResponse = z.infer<typeof ListCharacterItemsResponseSchema>;

function hasAtLeastOneItemField(request: Record<string, unknown>) {
	return Object.keys(request).length > 0;
}
