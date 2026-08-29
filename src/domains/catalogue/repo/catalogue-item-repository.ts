import { getDb } from "@providers/database/index.js";
import { and, asc, count, eq, ilike, not, or, sql } from "drizzle-orm";
import { z } from "zod";
import type {
	CatalogueItemDetails,
	CatalogueItemSearchQuery,
	CatalogueItemSearchResult,
	CatalogueItemSeed,
	CatalogueItemSeedAudit,
} from "../types/index.js";
import {
	CatalogueItemIdSchema,
	CatalogueItemSeedAuditSchema,
	CatalogueItemSeedSchema,
} from "../types/index.js";
import {
	itemColumns,
	itemUpdateSet,
	toAuditInsert,
	toCatalogueItemDetails,
	toCatalogueItemInsert,
	toCatalogueItemSearchResult,
} from "./catalogue-item-mappers.js";
import { catalogueItemSeedAuditsTable, catalogueItemsTable } from "./catalogue-item-table.js";

export interface CatalogueItemRepository {
	upsertItems(items: CatalogueItemSeed[], audit: CatalogueItemSeedAudit): Promise<number>;
	countItems(
		projection?: Pick<
			CatalogueItemSeedAudit,
			"source" | "sourceRevision" | "rulesVersion" | "capability" | "pack"
		>,
	): Promise<number>;
	searchItems(
		input: CatalogueItemSearchQuery,
	): Promise<{ items: CatalogueItemSearchResult[]; total: number }>;
	findItem(id: string): Promise<CatalogueItemDetails | null>;
	findLatestAudit(): Promise<CatalogueItemSeedAudit | null>;
}

export function createCatalogueItemRepository(): CatalogueItemRepository {
	return {
		async upsertItems(items, audit) {
			const parsedItems = z.array(CatalogueItemSeedSchema).parse(items);
			const parsedAudit = CatalogueItemSeedAuditSchema.parse(audit);
			if (parsedAudit.accepted !== parsedItems.length) {
				throw new Error(
					"Catalogue item audit accepted count must match the replacement projection.",
				);
			}
			if (
				parsedItems.some(
					(item) =>
						item.source !== parsedAudit.source ||
						item.sourceRevision !== parsedAudit.sourceRevision ||
						item.rulesVersion !== parsedAudit.rulesVersion ||
						item.capability !== parsedAudit.capability ||
						item.pack !== parsedAudit.pack,
				)
			) {
				throw new Error("Catalogue item audit provenance must match every replacement item.");
			}
			const db = getDb();
			await db.transaction(async (tx) => {
				if (parsedItems.length > 0) {
					await tx
						.insert(catalogueItemsTable)
						.values(parsedItems.map(toCatalogueItemInsert))
						.onConflictDoUpdate({
							target: [
								catalogueItemsTable.source,
								catalogueItemsTable.sourceKey,
								catalogueItemsTable.rulesVersion,
							],
							set: itemUpdateSet(),
						});
				}
				const incomingIdentity =
					parsedItems.length > 0
						? or(
								...parsedItems.map((item) =>
									and(
										eq(catalogueItemsTable.source, item.source),
										eq(catalogueItemsTable.sourceKey, item.sourceKey),
										eq(catalogueItemsTable.rulesVersion, item.rulesVersion),
									),
								),
							)
						: undefined;
				await tx
					.delete(catalogueItemsTable)
					.where(
						and(
							eq(catalogueItemsTable.source, parsedAudit.source),
							eq(catalogueItemsTable.seedCapability, parsedAudit.capability),
							eq(catalogueItemsTable.seedPack, parsedAudit.pack),
							eq(catalogueItemsTable.rulesVersion, parsedAudit.rulesVersion),
							incomingIdentity ? not(incomingIdentity) : undefined,
						),
					);
				await tx
					.insert(catalogueItemSeedAuditsTable)
					.values(toAuditInsert(parsedAudit))
					.onConflictDoUpdate({
						target: [
							catalogueItemSeedAuditsTable.source,
							catalogueItemSeedAuditsTable.sourceRevision,
							catalogueItemSeedAuditsTable.pack,
						],
						set: {
							processed: sql.raw("excluded.processed"),
							accepted: sql.raw("excluded.accepted"),
							rejected: sql.raw("excluded.rejected"),
							categoryCounts: sql.raw("excluded.category_counts"),
							createdAt: sql`now()`,
						},
					});
			});
			return parsedItems.length;
		},

		async countItems(projection) {
			const where = projection
				? and(
						eq(catalogueItemsTable.source, projection.source),
						eq(catalogueItemsTable.sourceRevision, projection.sourceRevision),
						eq(catalogueItemsTable.rulesVersion, projection.rulesVersion),
						eq(catalogueItemsTable.seedCapability, projection.capability),
						eq(catalogueItemsTable.seedPack, projection.pack),
					)
				: undefined;
			const [row] = await getDb().select({ value: count() }).from(catalogueItemsTable).where(where);
			return Number(row?.value ?? 0);
		},

		async searchItems(input) {
			const where = itemSearchCondition(input);
			const rows = await getDb()
				.select(itemColumns())
				.from(catalogueItemsTable)
				.where(where)
				.orderBy(asc(catalogueItemsTable.itemName), asc(catalogueItemsTable.sourceKey))
				.limit(input.limit);
			const [totalRow] = await getDb()
				.select({ value: count() })
				.from(catalogueItemsTable)
				.where(where);
			return {
				items: rows.map(toCatalogueItemSearchResult),
				total: Number(totalRow?.value ?? 0),
			};
		},

		async findItem(id) {
			const parsedId = CatalogueItemIdSchema.parse(id);
			const [row] = await getDb()
				.select(itemColumns())
				.from(catalogueItemsTable)
				.where(eq(catalogueItemsTable.id, parsedId))
				.limit(1);
			return row ? toCatalogueItemDetails(row) : null;
		},

		async findLatestAudit() {
			const [row] = await getDb()
				.select({
					source: catalogueItemSeedAuditsTable.source,
					sourceRevision: catalogueItemSeedAuditsTable.sourceRevision,
					rulesVersion: catalogueItemSeedAuditsTable.rulesVersion,
					capability: catalogueItemSeedAuditsTable.capability,
					pack: catalogueItemSeedAuditsTable.pack,
					processed: catalogueItemSeedAuditsTable.processed,
					accepted: catalogueItemSeedAuditsTable.accepted,
					rejected: catalogueItemSeedAuditsTable.rejected,
					categoryCounts: catalogueItemSeedAuditsTable.categoryCounts,
				})
				.from(catalogueItemSeedAuditsTable)
				.orderBy(sql`${catalogueItemSeedAuditsTable.createdAt} DESC`)
				.limit(1);
			return row ? CatalogueItemSeedAuditSchema.parse(row) : null;
		},
	};
}

function itemSearchCondition(input: CatalogueItemSearchQuery) {
	const conditions = [];
	const query = input.q.trim();
	if (query) {
		conditions.push(
			or(
				ilike(catalogueItemsTable.itemName, `%${query}%`),
				ilike(catalogueItemsTable.itemDescription, `%${query}%`),
			),
		);
	}
	if (input.kind) conditions.push(eq(catalogueItemsTable.itemKind, input.kind));
	if (input.category) conditions.push(ilike(catalogueItemsTable.itemCategory, input.category));
	if (input.rulesVersion) conditions.push(eq(catalogueItemsTable.rulesVersion, input.rulesVersion));
	if (input.isMagical !== undefined) {
		conditions.push(eq(catalogueItemsTable.isMagical, input.isMagical));
	}
	return conditions.length > 0 ? and(...conditions) : undefined;
}
