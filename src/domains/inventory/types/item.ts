import { z } from "zod";
import { CatalogueItemIdSchema, InventoryItemIdSchema, InventoryScopeIdSchema } from "./ids.js";
import { PositivePostgresIntegerSchema, PostgresNonNegativeRealSchema } from "./numeric.js";

export const InventoryItemTypeSchema = z.enum([
	"equipment",
	"potion",
	"scroll",
	"consumable",
	"misc",
]);
export type InventoryItemType = z.infer<typeof InventoryItemTypeSchema>;

export const InventoryItemRaritySchema = z.enum([
	"common",
	"uncommon",
	"rare",
	"very_rare",
	"legendary",
	"artifact",
]);
export type InventoryItemRarity = z.infer<typeof InventoryItemRaritySchema>;

export const InventoryRulesVersionSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9._-]+$/);
export type InventoryRulesVersion = z.infer<typeof InventoryRulesVersionSchema>;

export const JsonValueSchema = z.json();
export type JsonValue = z.infer<typeof JsonValueSchema>;

export const JsonObjectSchema = z.record(z.string(), JsonValueSchema);
export type JsonObject = z.infer<typeof JsonObjectSchema>;

const ItemTextSchema = z.string().min(1).max(4_000).regex(/\S/);
const ItemCategorySchema = z.string().min(1).max(120).regex(/\S/);
const PositiveQuantitySchema = PositivePostgresIntegerSchema;
const NonNegativeItemNumberSchema = PostgresNonNegativeRealSchema;
const ModifierMapSchema = z.record(z.string().min(1).max(80), z.number().finite());

export const InventoryItemBaseSchema = z.object({
	name: ItemTextSchema.max(120),
	type: InventoryItemTypeSchema,
	category: ItemCategorySchema,
	rarity: InventoryItemRaritySchema.nullable().optional(),
	description: ItemTextSchema.nullable().optional(),
	quantity: PositiveQuantitySchema.default(1),
	weight: NonNegativeItemNumberSchema.nullable().optional(),
	estimatedValue: NonNegativeItemNumberSchema.nullable().optional(),
	notes: ItemTextSchema.nullable().optional(),
	thumbnailUrl: z.string().min(1).max(500).nullable().optional(),
	properties: JsonObjectSchema.default({}),
	statModifiers: ModifierMapSchema.nullable().optional(),
	statOverrides: ModifierMapSchema.nullable().optional(),
});
export type InventoryItemBase = z.infer<typeof InventoryItemBaseSchema>;

export const InventoryItemSchema = InventoryItemBaseSchema.extend({
	id: InventoryItemIdSchema,
	inventoryScopeId: InventoryScopeIdSchema,
	rarity: InventoryItemRaritySchema.nullable(),
	description: ItemTextSchema.nullable(),
	quantity: PositiveQuantitySchema,
	weight: NonNegativeItemNumberSchema.nullable(),
	estimatedValue: NonNegativeItemNumberSchema.nullable(),
	notes: ItemTextSchema.nullable(),
	thumbnailUrl: z.string().min(1).max(500).nullable(),
	properties: JsonObjectSchema,
	isEquipped: z.boolean(),
	statModifiers: ModifierMapSchema.nullable(),
	statOverrides: ModifierMapSchema.nullable(),
	catalogueItemId: CatalogueItemIdSchema.nullable(),
	catalogueSourceKey: z.string().min(1).max(240).nullable(),
	catalogueRulesVersion: InventoryRulesVersionSchema.nullable(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
})
	.strict()
	.refine(hasValidCatalogueTraceability, {
		message: "Catalogue item references require a complete source-key and rules-version snapshot.",
		path: ["catalogueItemId"],
	});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const CharacterItemFilterSchema = z.object({
	search: z.string().max(120).optional(),
	type: InventoryItemTypeSchema.optional(),
	rarity: InventoryItemRaritySchema.optional(),
	category: ItemCategorySchema.optional(),
	isEquipped: z.boolean().optional(),
	catalogueItemId: CatalogueItemIdSchema.optional(),
});
export type CharacterItemFilter = z.infer<typeof CharacterItemFilterSchema>;

function hasValidCatalogueTraceability(item: {
	catalogueItemId: string | null;
	catalogueSourceKey: string | null;
	catalogueRulesVersion: string | null;
}) {
	const hasCatalogueItemId = item.catalogueItemId !== null;
	const hasSourceKey = item.catalogueSourceKey !== null;
	const hasRulesVersion = item.catalogueRulesVersion !== null;

	return hasSourceKey === hasRulesVersion && (!hasCatalogueItemId || hasSourceKey);
}
