import { z } from "zod";
import type { InventoryItem } from "../types/index.js";
import {
	CatalogueItemIdSchema,
	InventoryItemBaseSchema,
	InventoryItemRaritySchema,
	InventoryItemSchema,
	InventoryItemTypeSchema,
	InventoryRulesVersionSchema,
	InventoryScopeIdSchema,
	JsonObjectSchema,
	PositivePostgresIntegerSchema,
	PostgresNonNegativeRealSchema,
} from "../types/index.js";

const DatabaseDateSchema = z.union([z.date(), z.iso.datetime()]);
const CatalogueSourceKeySchema = z.string().min(1).max(240);
const ItemTraceabilitySchema = z
	.object({
		catalogueItemId: CatalogueItemIdSchema.nullable().optional().default(null),
		catalogueSourceKey: CatalogueSourceKeySchema.nullable().optional().default(null),
		catalogueRulesVersion: InventoryRulesVersionSchema.nullable().optional().default(null),
		isEquipped: z.boolean().optional().default(false),
	})
	.strict();

export const InventoryItemCreateInputSchema = InventoryItemBaseSchema.merge(ItemTraceabilitySchema)
	.extend({ id: z.string().uuid().optional() })
	.strict()
	.superRefine(validateCatalogueTraceability);
export type InventoryItemCreateInput = z.infer<typeof InventoryItemCreateInputSchema>;

const ModifierMapSchema = z.record(z.string().min(1).max(80), z.number().finite());

export const InventoryItemUpdateInputSchema = z
	.object({
		name: z.string().min(1).max(120).regex(/\S/).optional(),
		type: InventoryItemTypeSchema.optional(),
		category: z.string().min(1).max(120).regex(/\S/).optional(),
		rarity: InventoryItemRaritySchema.nullable().optional(),
		description: z.string().min(1).max(4_000).regex(/\S/).nullable().optional(),
		quantity: PositivePostgresIntegerSchema.optional(),
		weight: PostgresNonNegativeRealSchema.nullable().optional(),
		estimatedValue: PostgresNonNegativeRealSchema.nullable().optional(),
		notes: z.string().min(1).max(4_000).regex(/\S/).nullable().optional(),
		thumbnailUrl: z.string().min(1).max(500).nullable().optional(),
		properties: JsonObjectSchema.optional(),
		statModifiers: ModifierMapSchema.nullable().optional(),
		statOverrides: ModifierMapSchema.nullable().optional(),
		catalogueItemId: CatalogueItemIdSchema.nullable().optional(),
		catalogueSourceKey: CatalogueSourceKeySchema.nullable().optional(),
		catalogueRulesVersion: InventoryRulesVersionSchema.nullable().optional(),
		isEquipped: z.boolean().optional(),
	})
	.strict();
export type InventoryItemUpdateInput = z.infer<typeof InventoryItemUpdateInputSchema>;

const InventoryItemDatabaseRowSchema = z
	.object({
		id: z.string().uuid(),
		inventoryScopeId: InventoryScopeIdSchema,
		name: z.string(),
		type: InventoryItemTypeSchema,
		category: z.string(),
		rarity: InventoryItemRaritySchema.nullable(),
		description: z.string().nullable(),
		quantity: PositivePostgresIntegerSchema,
		weight: PostgresNonNegativeRealSchema.nullable(),
		estimatedValue: PostgresNonNegativeRealSchema.nullable(),
		notes: z.string().nullable(),
		thumbnailUrl: z.string().nullable(),
		catalogueItemId: CatalogueItemIdSchema.nullable(),
		catalogueSourceKey: CatalogueSourceKeySchema.nullable(),
		catalogueRulesVersion: InventoryRulesVersionSchema.nullable(),
		properties: z.unknown(),
		isEquipped: z.boolean(),
		statModifiers: z.unknown().nullable(),
		statOverrides: z.unknown().nullable(),
		createdAt: DatabaseDateSchema,
		updatedAt: DatabaseDateSchema,
	})
	.strict();

export function toInventoryItem(row: unknown): InventoryItem {
	const parsed = InventoryItemDatabaseRowSchema.parse(row);
	return InventoryItemSchema.parse({
		...parsed,
		createdAt: toIsoString(parsed.createdAt),
		updatedAt: toIsoString(parsed.updatedAt),
		properties: JsonObjectSchema.parse(parsed.properties),
	});
}

export function toInventoryItemInsert(scopeId: unknown, input: unknown) {
	const parsedScopeId = InventoryScopeIdSchema.parse(scopeId);
	const parsed = InventoryItemCreateInputSchema.parse(input);
	return {
		id: parsed.id,
		inventoryScopeId: parsedScopeId,
		name: parsed.name,
		type: parsed.type,
		category: parsed.category,
		rarity: parsed.rarity ?? null,
		description: parsed.description ?? null,
		quantity: parsed.quantity,
		weight: parsed.weight ?? null,
		estimatedValue: parsed.estimatedValue ?? null,
		notes: parsed.notes ?? null,
		thumbnailUrl: parsed.thumbnailUrl ?? null,
		catalogueItemId: parsed.catalogueItemId,
		catalogueSourceKey: parsed.catalogueSourceKey,
		catalogueRulesVersion: parsed.catalogueRulesVersion,
		properties: JsonObjectSchema.parse(parsed.properties),
		isEquipped: parsed.isEquipped,
		statModifiers: parsed.statModifiers ?? null,
		statOverrides: parsed.statOverrides ?? null,
	};
}

export function parseInventoryItemUpdate(input: unknown): InventoryItemUpdateInput {
	const parsed = InventoryItemUpdateInputSchema.parse(input);
	if (Object.keys(parsed).length === 0) {
		throw new z.ZodError([
			{
				code: "custom",
				path: [],
				message: "An inventory item update must include at least one field.",
			},
		]);
	}
	return parsed;
}

function validateCatalogueTraceability(
	value: Pick<
		InventoryItemCreateInput,
		"catalogueItemId" | "catalogueSourceKey" | "catalogueRulesVersion"
	>,
	ctx: z.RefinementCtx,
) {
	const hasItemId = value.catalogueItemId !== null;
	const hasSourceKey = value.catalogueSourceKey !== null;
	const hasRulesVersion = value.catalogueRulesVersion !== null;
	if (hasSourceKey !== hasRulesVersion || (hasItemId && !hasSourceKey)) {
		ctx.addIssue({
			code: "custom",
			path: ["catalogueItemId"],
			message: "Catalogue references require a complete source-key and rules-version snapshot.",
		});
	}
}

function toIsoString(value: Date | string) {
	return value instanceof Date ? value.toISOString() : value;
}
