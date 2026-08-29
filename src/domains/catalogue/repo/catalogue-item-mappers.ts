import { sql } from "drizzle-orm";
import { z } from "zod";
import type {
	CatalogueItemDetails,
	CatalogueItemSearchResult,
	CatalogueItemSeed,
	CatalogueItemSeedAudit,
} from "../types/index.js";
import {
	CatalogueItemDetailsSchema,
	CatalogueItemIdSchema,
	CatalogueItemKindSchema,
	CatalogueItemRaritySchema,
	CatalogueItemSearchResultSchema,
	CatalogueSourceSchema,
	RulesVersionSchema,
} from "../types/index.js";
import { catalogueItemsTable } from "./catalogue-item-table.js";

const CatalogueItemRowSchema = z.object({
	id: CatalogueItemIdSchema,
	source: CatalogueSourceSchema,
	sourceKey: z.string(),
	sourcePath: z.string(),
	sourceRevision: z.string(),
	sourceUrl: z.string().url(),
	rulesVersion: RulesVersionSchema,
	license: z.string(),
	seedCapability: z.literal("equipment"),
	seedPack: z.literal("equipment24"),
	seedMetadata: z.record(z.string(), z.json()),
	itemIdentifier: z.string(),
	itemName: z.string(),
	itemKind: CatalogueItemKindSchema,
	itemCategory: z.string(),
	itemDescription: z.string(),
	isMagical: z.boolean(),
	itemRarity: CatalogueItemRaritySchema.nullable(),
	requiresAttunement: z.boolean(),
	costValue: z.number().finite().nonnegative().nullable(),
	costDenomination: z.string().nullable(),
	weight: z.number().finite().nonnegative().nullable(),
	thumbnailUrl: z.string().nullable(),
	properties: z.array(z.string()),
	stats: z.record(z.string(), z.json()),
	sourcePayload: z.unknown(),
});

export function toCatalogueItemInsert(item: CatalogueItemSeed) {
	return {
		source: item.source,
		sourceKey: item.sourceKey,
		sourcePath: item.sourcePath,
		sourceRevision: item.sourceRevision,
		sourceUrl: item.sourceUrl,
		rulesVersion: item.rulesVersion,
		license: item.license,
		seedCapability: item.capability,
		seedPack: item.pack,
		seedMetadata: item.seedMetadata,
		itemIdentifier: item.identifier,
		itemName: item.name,
		itemKind: item.kind,
		itemCategory: item.category,
		itemDescription: item.description,
		isMagical: item.isMagical,
		itemRarity: item.rarity,
		requiresAttunement: item.requiresAttunement,
		costValue: item.costValue,
		costDenomination: item.costDenomination,
		weight: item.weight,
		thumbnailUrl: item.thumbnailUrl,
		properties: item.properties,
		stats: item.stats,
		sourcePayload: item.sourcePayload,
	};
}

export function itemUpdateSet() {
	return {
		sourcePath: sql.raw("excluded.source_path"),
		sourceRevision: sql.raw("excluded.source_revision"),
		sourceUrl: sql.raw("excluded.source_url"),
		license: sql.raw("excluded.license"),
		seedMetadata: sql.raw("excluded.seed_metadata"),
		itemIdentifier: sql.raw("excluded.item_identifier"),
		itemName: sql.raw("excluded.item_name"),
		itemKind: sql.raw("excluded.item_kind"),
		itemCategory: sql.raw("excluded.item_category"),
		itemDescription: sql.raw("excluded.item_description"),
		isMagical: sql.raw("excluded.is_magical"),
		itemRarity: sql.raw("excluded.item_rarity"),
		requiresAttunement: sql.raw("excluded.requires_attunement"),
		costValue: sql.raw("excluded.cost_value"),
		costDenomination: sql.raw("excluded.cost_denomination"),
		weight: sql.raw("excluded.weight"),
		thumbnailUrl: sql.raw("excluded.thumbnail_url"),
		properties: sql.raw("excluded.properties"),
		stats: sql.raw("excluded.stats"),
		sourcePayload: sql.raw("excluded.source_payload"),
		updatedAt: sql`now()`,
	};
}

export function toAuditInsert(audit: CatalogueItemSeedAudit) {
	return {
		source: audit.source,
		sourceRevision: audit.sourceRevision,
		rulesVersion: audit.rulesVersion,
		capability: audit.capability,
		pack: audit.pack,
		processed: audit.processed,
		accepted: audit.accepted,
		rejected: audit.rejected,
		categoryCounts: audit.categoryCounts,
	};
}

export function toCatalogueItemSearchResult(row: unknown): CatalogueItemSearchResult {
	const parsed = CatalogueItemRowSchema.parse(row);
	return CatalogueItemSearchResultSchema.parse(toCatalogueItem(parsed));
}

export function toCatalogueItemDetails(row: unknown): CatalogueItemDetails {
	const parsed = CatalogueItemRowSchema.parse(row);
	return CatalogueItemDetailsSchema.parse(toCatalogueItem(parsed));
}

function toCatalogueItem(row: z.infer<typeof CatalogueItemRowSchema>) {
	return {
		id: row.id,
		source: row.source,
		sourceKey: row.sourceKey,
		sourcePath: row.sourcePath,
		rulesVersion: row.rulesVersion,
		license: row.license,
		sourcePayload: row.sourcePayload,
		sourceRevision: row.sourceRevision,
		capability: row.seedCapability,
		pack: row.seedPack,
		sourceUrl: row.sourceUrl,
		seedMetadata: row.seedMetadata,
		identifier: row.itemIdentifier,
		name: row.itemName,
		kind: row.itemKind,
		category: row.itemCategory,
		description: row.itemDescription,
		isMagical: row.isMagical,
		rarity: row.itemRarity,
		requiresAttunement: row.requiresAttunement,
		costValue: row.costValue,
		costDenomination: row.costDenomination,
		weight: row.weight,
		thumbnailUrl: row.thumbnailUrl,
		properties: row.properties,
		stats: row.stats,
	};
}

export function itemColumns() {
	return {
		id: catalogueItemsTable.id,
		source: catalogueItemsTable.source,
		sourceKey: catalogueItemsTable.sourceKey,
		sourcePath: catalogueItemsTable.sourcePath,
		sourceRevision: catalogueItemsTable.sourceRevision,
		sourceUrl: catalogueItemsTable.sourceUrl,
		rulesVersion: catalogueItemsTable.rulesVersion,
		license: catalogueItemsTable.license,
		seedCapability: catalogueItemsTable.seedCapability,
		seedPack: catalogueItemsTable.seedPack,
		seedMetadata: catalogueItemsTable.seedMetadata,
		itemIdentifier: catalogueItemsTable.itemIdentifier,
		itemName: catalogueItemsTable.itemName,
		itemKind: catalogueItemsTable.itemKind,
		itemCategory: catalogueItemsTable.itemCategory,
		itemDescription: catalogueItemsTable.itemDescription,
		isMagical: catalogueItemsTable.isMagical,
		itemRarity: catalogueItemsTable.itemRarity,
		requiresAttunement: catalogueItemsTable.requiresAttunement,
		costValue: catalogueItemsTable.costValue,
		costDenomination: catalogueItemsTable.costDenomination,
		weight: catalogueItemsTable.weight,
		thumbnailUrl: catalogueItemsTable.thumbnailUrl,
		properties: catalogueItemsTable.properties,
		stats: catalogueItemsTable.stats,
		sourcePayload: catalogueItemsTable.sourcePayload,
	};
}
