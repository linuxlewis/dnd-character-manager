import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import type { CatalogueSource, RulesVersion } from "../types/index.js";

export const catalogueSpellsTable = pgTable(
	"catalogue_spells",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		source: text("source").$type<CatalogueSource>().notNull(),
		sourceKey: text("source_key").notNull(),
		sourcePath: text("source_path").notNull(),
		rulesVersion: text("rules_version").$type<RulesVersion>().notNull(),
		license: text("license").notNull(),
		spellIndex: text("spell_index").notNull(),
		spellName: text("spell_name").notNull(),
		spellLevel: integer("spell_level").notNull(),
		spellUrl: text("spell_url").notNull(),
		spellDesc: jsonb("spell_desc").$type<unknown>().notNull(),
		spellHigherLevel: jsonb("spell_higher_level").$type<unknown>().notNull().default([]),
		spellMetadata: jsonb("spell_metadata").$type<unknown>().notNull().default([]),
		sourcePayload: jsonb("source_payload").$type<unknown>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("catalogue_spells_source_key_unique").on(table.source, table.sourceKey),
		uniqueIndex("catalogue_spells_spell_index_unique").on(table.spellIndex),
		index("catalogue_spells_name_idx").on(table.spellName),
		index("catalogue_spells_level_name_idx").on(table.spellLevel, table.spellName),
	],
);
