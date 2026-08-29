import { z } from "zod";
import {
	CatalogueFoundryEquipmentSeedProvenanceSchema,
	CatalogueSourceSchema,
	ImmutableSourceRevisionSchema,
	RulesVersionSchema,
} from "./provenance.js";

export const CatalogueItemIdSchema = z.string().uuid();
export type CatalogueItemId = z.infer<typeof CatalogueItemIdSchema>;

export const CatalogueItemKindSchema = z.enum([
	"weapon",
	"armor",
	"adventuring-gear",
	"consumable",
	"potion",
	"scroll",
	"magic-item",
	"tool",
	"container",
	"other",
]);
export type CatalogueItemKind = z.infer<typeof CatalogueItemKindSchema>;

export const CatalogueItemRaritySchema = z.enum([
	"common",
	"uncommon",
	"rare",
	"very_rare",
	"legendary",
	"artifact",
]);
export type CatalogueItemRarity = z.infer<typeof CatalogueItemRaritySchema>;

const NonNegativeNumberSchema = z.number().finite().nonnegative();
const NullableNonNegativeNumberSchema = NonNegativeNumberSchema.nullable();
const ItemNameSchema = z.string().min(1).max(120).regex(/\S/);
const ItemCategorySchema = z.string().min(1).max(120).regex(/\S/);
const ItemDescriptionSchema = z.string();
const ItemPropertiesSchema = z.array(z.string().min(1).max(80)).max(100);
const ItemStatsSchema = z.record(z.string().min(1).max(80), z.json());

const CatalogueItemFieldsSchema = z.object({
	identifier: z.string().min(1).max(240),
	name: ItemNameSchema,
	kind: CatalogueItemKindSchema,
	category: ItemCategorySchema,
	description: ItemDescriptionSchema,
	isMagical: z.boolean(),
	rarity: CatalogueItemRaritySchema.nullable(),
	requiresAttunement: z.boolean(),
	costValue: NullableNonNegativeNumberSchema,
	costDenomination: z.string().min(1).max(20).nullable(),
	weight: NullableNonNegativeNumberSchema,
	thumbnailUrl: z.string().min(1).max(500).nullable(),
	properties: ItemPropertiesSchema,
	stats: ItemStatsSchema,
});

const CatalogueItemProvenanceSchema = CatalogueFoundryEquipmentSeedProvenanceSchema.extend({
	seedMetadata: z.record(z.string().min(1).max(80), z.json()),
});

export const CatalogueItemSeedSchema = CatalogueItemProvenanceSchema.and(CatalogueItemFieldsSchema);
export type CatalogueItemSeed = z.infer<typeof CatalogueItemSeedSchema>;

export const CatalogueItemSearchResultSchema = CatalogueItemProvenanceSchema.extend({
	id: CatalogueItemIdSchema,
}).and(CatalogueItemFieldsSchema);
export type CatalogueItemSearchResult = z.infer<typeof CatalogueItemSearchResultSchema>;

export const CatalogueItemDetailsSchema = CatalogueItemSearchResultSchema;
export type CatalogueItemDetails = z.infer<typeof CatalogueItemDetailsSchema>;

export const CatalogueItemSearchQuerySchema = z
	.object({
		q: z.string().max(120).optional().default(""),
		kind: CatalogueItemKindSchema.optional(),
		category: z.string().min(1).max(120).optional(),
		rulesVersion: RulesVersionSchema.optional(),
		isMagical: z.preprocess(parseBooleanQuery, z.boolean()).optional(),
		limit: z.coerce.number().int().min(1).max(100).optional().default(50),
	})
	.strict();
export type CatalogueItemSearchQuery = z.infer<typeof CatalogueItemSearchQuerySchema>;

export const CatalogueItemSearchResponseSchema = z.object({
	readiness: z.literal("ready"),
	items: z.array(CatalogueItemSearchResultSchema),
	total: z.number().int().nonnegative(),
});
export type CatalogueItemSearchResponse = z.infer<typeof CatalogueItemSearchResponseSchema>;

export interface CatalogueItemSearchPort {
	searchItems(input: CatalogueItemSearchQuery): Promise<{
		items: CatalogueItemSearchResult[];
		total: number;
	}>;
}

export interface CatalogueItemDetailPort {
	getItemDetails(id: CatalogueItemId): Promise<CatalogueItemDetails | null>;
}

export const CatalogueItemsUnavailableResponseSchema = z.object({
	readiness: z.literal("unavailable"),
	capability: z.literal("items"),
	code: z.literal("catalogue_items_unavailable"),
	error: z.string(),
});
export type CatalogueItemsUnavailableResponse = z.infer<
	typeof CatalogueItemsUnavailableResponseSchema
>;

export const CatalogueItemAuditCategoryCountsSchema = z
	.object({
		weapons: z.number().int().nonnegative(),
		armor: z.number().int().nonnegative(),
		adventuringGear: z.number().int().nonnegative(),
		consumables: z.number().int().nonnegative(),
		potions: z.number().int().nonnegative(),
		scrolls: z.number().int().nonnegative(),
		magicItems: z.number().int().nonnegative(),
	})
	.catchall(z.number().int().nonnegative());
export type CatalogueItemAuditCategoryCounts = z.infer<
	typeof CatalogueItemAuditCategoryCountsSchema
>;

export const CatalogueItemSeedAuditSchema = z.object({
	processed: z.number().int().nonnegative(),
	accepted: z.number().int().nonnegative(),
	rejected: z.number().int().nonnegative(),
	categoryCounts: CatalogueItemAuditCategoryCountsSchema,
});
export type CatalogueItemSeedAudit = z.infer<typeof CatalogueItemSeedAuditSchema>;

export const CatalogueItemSeedStatusSchema = z.object({
	capability: z.literal("items"),
	pack: z.literal("equipment24"),
	readiness: z.enum(["ready", "unavailable"]),
	seeded: z.boolean(),
	count: z.number().int().nonnegative(),
	sourceRevision: ImmutableSourceRevisionSchema.nullable(),
	audit: CatalogueItemSeedAuditSchema.nullable(),
});
export type CatalogueItemSeedStatus = z.infer<typeof CatalogueItemSeedStatusSchema>;

export interface CatalogueItemStatusPort {
	getItemStatus(): Promise<CatalogueItemSeedStatus>;
}

export const CatalogueCapabilityStatusSchema = z.object({
	capability: z.enum(["spells", "items"]),
	pack: z.enum(["spells24", "equipment24"]),
	readiness: z.enum(["ready", "unavailable"]),
	seeded: z.boolean(),
	count: z.number().int().nonnegative(),
	sourceRevision: ImmutableSourceRevisionSchema.nullable(),
	audit: CatalogueItemSeedAuditSchema.nullable().optional(),
});
export type CatalogueCapabilityStatus = z.infer<typeof CatalogueCapabilityStatusSchema>;

export const CatalogueStatusResponseSchema = z.object({
	source: z.object({
		name: CatalogueSourceSchema,
		sourceRevision: ImmutableSourceRevisionSchema,
		rulesVersion: RulesVersionSchema,
		sourceUrl: z.string().url(),
		attribution: z.string().min(1),
	}),
	capabilities: z.array(CatalogueCapabilityStatusSchema),
	items: CatalogueItemSeedStatusSchema,
});
export type CatalogueStatusResponse = z.infer<typeof CatalogueStatusResponseSchema>;

function parseBooleanQuery(value: unknown) {
	if (value === "true") return true;
	if (value === "false") return false;
	return value;
}
