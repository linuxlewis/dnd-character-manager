import { getDb } from "@providers/database/index.js";
import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
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
	countItems(): Promise<number>;
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

		async countItems() {
			const [row] = await getDb().select({ value: count() }).from(catalogueItemsTable);
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
