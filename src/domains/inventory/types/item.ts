import { z } from "zod";
import { CatalogueItemIdSchema, InventoryItemIdSchema, InventoryScopeIdSchema } from "./ids.js";

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

export const InventoryCatalogueSourceSchema = z.enum([
	"foundry-dnd5e",
	"open5e",
	"official-srd",
	"dnd5eapi-legacy",
]);
export type InventoryCatalogueSource = z.infer<typeof InventoryCatalogueSourceSchema>;

export const InventoryRulesVersionSchema = z.enum(["2014", "2024"]);
export type InventoryRulesVersion = z.infer<typeof InventoryRulesVersionSchema>;

export const JsonValueSchema = z.json();
export type JsonValue = z.infer<typeof JsonValueSchema>;

export const JsonObjectSchema = z.record(z.string(), JsonValueSchema);
export type JsonObject = z.infer<typeof JsonObjectSchema>;

const ItemTextSchema = z.string().min(1).max(4_000).regex(/\S/);
const ItemCategorySchema = z.string().min(1).max(120).regex(/\S/);
const PositiveQuantitySchema = z.number().int().positive();
const NonNegativeItemNumberSchema = z.number().nonnegative().finite();
const ModifierMapSchema = z.record(z.string().min(1).max(80), z.number().finite());

export const InventoryCatalogueProvenanceSchema = z.object({
	source: InventoryCatalogueSourceSchema,
	sourceKey: z.string().min(1).max(240),
	sourcePath: z.string().min(1).max(500),
	rulesVersion: InventoryRulesVersionSchema,
	license: z.string().max(120),
});
export type InventoryCatalogueProvenance = z.infer<typeof InventoryCatalogueProvenanceSchema>;

export const InventoryCatalogueReferenceSchema = z.object({
	catalogueItemId: CatalogueItemIdSchema,
	provenance: InventoryCatalogueProvenanceSchema,
});
export type InventoryCatalogueReference = z.infer<typeof InventoryCatalogueReferenceSchema>;

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
	catalogueSource: InventoryCatalogueSourceSchema.nullable(),
	catalogueSourcePath: z.string().min(1).max(500).nullable(),
	catalogueRulesVersion: InventoryRulesVersionSchema.nullable(),
	catalogueLicense: z.string().max(120).nullable(),
	catalogue: InventoryCatalogueProvenanceSchema.nullable().optional(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const InventoryItemFilterSchema = z.object({
	search: z.string().max(120).optional(),
	type: InventoryItemTypeSchema.optional(),
	rarity: InventoryItemRaritySchema.optional(),
	category: ItemCategorySchema.optional(),
	isEquipped: z.boolean().optional(),
	catalogueItemId: CatalogueItemIdSchema.optional(),
});
export type InventoryItemFilter = z.infer<typeof InventoryItemFilterSchema>;

export const CharacterItemFilterSchema = InventoryItemFilterSchema;
export type CharacterItemFilter = z.infer<typeof CharacterItemFilterSchema>;
