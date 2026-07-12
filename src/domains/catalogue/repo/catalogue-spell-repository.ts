import { getDb } from "@providers/database/index.js";
import { and, asc, count, eq, gt, ilike, lte, sql } from "drizzle-orm";
import { z } from "zod";
import type {
	CatalogueSpellDetails,
	CatalogueSpellSearchResult,
	CatalogueSpellSeed,
} from "../types/index.js";
import {
	CatalogueSourceSchema,
	CatalogueSpellDetailsSchema,
	CatalogueSpellDetailTextSchema,
	CatalogueSpellMetadataItemSchema,
	CatalogueSpellSearchResultSchema,
	CatalogueSpellSeedSchema,
	RulesVersionSchema,
} from "../types/index.js";
import { catalogueSpellsTable } from "./catalogue-spell-table.js";

const CatalogueSpellRowSchema = z.object({
	source: CatalogueSourceSchema,
	sourceKey: z.string(),
	sourcePath: z.string(),
	rulesVersion: RulesVersionSchema,
	license: z.string(),
	spellIndex: z.string(),
	spellName: z.string(),
	spellLevel: z.number().int(),
	spellUrl: z.string(),
	spellDesc: z.array(CatalogueSpellDetailTextSchema),
	spellHigherLevel: z.array(CatalogueSpellDetailTextSchema),
	spellMetadata: z.array(CatalogueSpellMetadataItemSchema),
	sourcePayload: z.unknown(),
});

export interface SearchCatalogueSpellsInput {
	query: string;
	slotLevel: number;
}

export interface CatalogueSpellRepository {
	upsertSpells(spells: CatalogueSpellSeed[]): Promise<number>;
	countSpells(): Promise<number>;
	searchSpells(input: SearchCatalogueSpellsInput): Promise<CatalogueSpellSearchResult[]>;
	findSpell(spellIndex: string): Promise<CatalogueSpellDetails | null>;
}

export function createCatalogueSpellRepository(): CatalogueSpellRepository {
	return {
		async upsertSpells(spells) {
			const parsed = z.array(CatalogueSpellSeedSchema).parse(spells);
			if (parsed.length === 0) return 0;

			await getDb()
				.insert(catalogueSpellsTable)
				.values(parsed.map(toCatalogueSpellInsert))
				.onConflictDoUpdate({
					target: catalogueSpellsTable.spellIndex,
					set: {
						source: sql.raw(`excluded.${catalogueSpellsTable.source.name}`),
						sourceKey: sql.raw(`excluded.${catalogueSpellsTable.sourceKey.name}`),
						sourcePath: sql.raw(`excluded.${catalogueSpellsTable.sourcePath.name}`),
						rulesVersion: sql.raw(`excluded.${catalogueSpellsTable.rulesVersion.name}`),
						license: sql.raw(`excluded.${catalogueSpellsTable.license.name}`),
						spellName: sql.raw(`excluded.${catalogueSpellsTable.spellName.name}`),
						spellLevel: sql.raw(`excluded.${catalogueSpellsTable.spellLevel.name}`),
						spellUrl: sql.raw(`excluded.${catalogueSpellsTable.spellUrl.name}`),
						spellDesc: sql.raw(`excluded.${catalogueSpellsTable.spellDesc.name}`),
						spellHigherLevel: sql.raw(`excluded.${catalogueSpellsTable.spellHigherLevel.name}`),
						spellMetadata: sql.raw(`excluded.${catalogueSpellsTable.spellMetadata.name}`),
						sourcePayload: sql.raw(`excluded.${catalogueSpellsTable.sourcePayload.name}`),
						updatedAt: sql`now()`,
					},
				});

			return parsed.length;
		},

		async countSpells() {
			const [row] = await getDb().select({ value: count() }).from(catalogueSpellsTable);
			return Number(row?.value ?? 0);
		},

		async searchSpells(input) {
			const query = input.query.trim();
			if (!query) return [];

			const rows = await getDb()
				.select(catalogueSpellColumns())
				.from(catalogueSpellsTable)
				.where(
					and(
						spellBucketCondition(input.slotLevel),
						ilike(catalogueSpellsTable.spellName, `%${query}%`),
					),
				)
				.orderBy(asc(catalogueSpellsTable.spellLevel), asc(catalogueSpellsTable.spellName));

			return rows.map(toCatalogueSpellSearchResult);
		},

		async findSpell(spellIndex) {
			const [row] = await getDb()
				.select(catalogueSpellColumns())
				.from(catalogueSpellsTable)
				.where(eq(catalogueSpellsTable.spellIndex, spellIndex))
				.limit(1);

			return row ? toCatalogueSpellDetails(row) : null;
		},
	};
}

function spellBucketCondition(slotLevel: number) {
	if (slotLevel === 0) return eq(catalogueSpellsTable.spellLevel, 0);
	return and(
		gt(catalogueSpellsTable.spellLevel, 0),
		lte(catalogueSpellsTable.spellLevel, slotLevel),
	);
}

export function toCatalogueSpellSearchResult(row: unknown): CatalogueSpellSearchResult {
	const parsed = CatalogueSpellRowSchema.parse(row);
	return CatalogueSpellSearchResultSchema.parse({
		spellIndex: parsed.spellIndex,
		name: parsed.spellName,
		level: parsed.spellLevel,
		url: parsed.spellUrl,
	});
}

export function toCatalogueSpellDetails(row: unknown): CatalogueSpellDetails {
	const parsed = CatalogueSpellRowSchema.parse(row);
	return CatalogueSpellDetailsSchema.parse({
		source: parsed.source,
		sourceKey: parsed.sourceKey,
		sourcePath: parsed.sourcePath,
		rulesVersion: parsed.rulesVersion,
		license: parsed.license,
		spellIndex: parsed.spellIndex,
		name: parsed.spellName,
		level: parsed.spellLevel,
		url: parsed.spellUrl,
		desc: parsed.spellDesc,
		higherLevel: parsed.spellHigherLevel,
		metadata: parsed.spellMetadata,
		sourcePayload: parsed.sourcePayload,
	});
}

function toCatalogueSpellInsert(spell: CatalogueSpellSeed) {
	return {
		source: spell.source,
		sourceKey: spell.sourceKey,
		sourcePath: spell.sourcePath,
		rulesVersion: spell.rulesVersion,
		license: spell.license,
		spellIndex: spell.spellIndex,
		spellName: spell.name,
		spellLevel: spell.level,
		spellUrl: spell.url,
		spellDesc: spell.desc,
		spellHigherLevel: spell.higherLevel,
		spellMetadata: spell.metadata,
		sourcePayload: spell.sourcePayload,
	};
}

function catalogueSpellColumns() {
	return {
		source: catalogueSpellsTable.source,
		sourceKey: catalogueSpellsTable.sourceKey,
		sourcePath: catalogueSpellsTable.sourcePath,
		rulesVersion: catalogueSpellsTable.rulesVersion,
		license: catalogueSpellsTable.license,
		spellIndex: catalogueSpellsTable.spellIndex,
		spellName: catalogueSpellsTable.spellName,
		spellLevel: catalogueSpellsTable.spellLevel,
		spellUrl: catalogueSpellsTable.spellUrl,
		spellDesc: catalogueSpellsTable.spellDesc,
		spellHigherLevel: catalogueSpellsTable.spellHigherLevel,
		spellMetadata: catalogueSpellsTable.spellMetadata,
		sourcePayload: catalogueSpellsTable.sourcePayload,
	};
}
