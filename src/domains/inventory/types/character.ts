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
import { CatalogueItemIdSchema, InventoryCharacterIdSchema } from "./ids.js";
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

export const AddCharacterTreasuryPreviewRequestSchema = CurrencyAddRequestSchema;
export type AddCharacterTreasuryPreviewRequest = z.infer<
	typeof AddCharacterTreasuryPreviewRequestSchema
>;

export const AddCharacterTreasuryRequestSchema = CurrencyAddRequestSchema.extend({
	expectedPrevious: CurrencyBalanceSchema,
}).strict();
export type AddCharacterTreasuryRequest = z.infer<typeof AddCharacterTreasuryRequestSchema>;

export const SpendCharacterTreasuryPreviewRequestSchema = CurrencySpendRequestSchema;
export type SpendCharacterTreasuryPreviewRequest = z.infer<
	typeof SpendCharacterTreasuryPreviewRequestSchema
>;

export const SpendCharacterTreasuryRequestSchema = CurrencySpendRequestSchema.extend({
	expectedPrevious: CurrencyBalanceSchema,
}).strict();
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

const AddCharacterTreasuryPreviewSchema = CurrencyPreviewSchema.omit({ change: true })
	.extend({ operation: z.literal("add") })
	.strict();

export const AddCharacterTreasuryPreviewResponseSchema = z
	.object({
		treasury: CharacterTreasurySchema,
		preview: AddCharacterTreasuryPreviewSchema,
	})
	.strict();
export type AddCharacterTreasuryPreviewResponse = z.infer<
	typeof AddCharacterTreasuryPreviewResponseSchema
>;

const SpendCharacterTreasuryPreviewSchema = CurrencyPreviewSchema.extend({
	operation: z.literal("spend"),
}).strict();

export const SpendCharacterTreasuryPreviewResponseSchema = z
	.object({
		treasury: CharacterTreasurySchema,
		preview: SpendCharacterTreasuryPreviewSchema,
	})
	.strict();
export type SpendCharacterTreasuryPreviewResponse = z.infer<
	typeof SpendCharacterTreasuryPreviewResponseSchema
>;

export const CharacterTreasuryPreviewResponseSchema = z.union([
	AddCharacterTreasuryPreviewResponseSchema,
	SpendCharacterTreasuryPreviewResponseSchema,
]);
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

export const ListCharacterItemsRequestSchema = CharacterItemFilterSchema.extend({
	isEquipped: z.preprocess(parseBooleanQuery, z.boolean()).optional(),
}).strict();
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

function parseBooleanQuery(value: unknown) {
	if (value === "true") return true;
	if (value === "false") return false;
	return value;
}
