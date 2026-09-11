import { userTable } from "@providers/auth/schema.js";
import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import type { CharacterClass, SpellSlotAction } from "../types/index.js";

export const charactersTable = pgTable(
	"characters",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => userTable.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		className: text("class").$type<CharacterClass>().notNull(),
		level: integer("level").notNull(),
		experiencePoints: integer("experience_points").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("characters_user_created_at_idx").on(table.userId, table.createdAt.desc())],
);

export const characterTable = charactersTable;

export const characterHealthTable = pgTable("character_health", {
	characterId: uuid("character_id")
		.primaryKey()
		.references(() => charactersTable.id, { onDelete: "cascade" }),
	currentHp: integer("current_hp").notNull(),
	maxHp: integer("max_hp").notNull(),
	temporaryHp: integer("temporary_hp").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const characterAttributesTable = pgTable(
	"character_attributes",
	{
		characterId: uuid("character_id")
			.primaryKey()
			.references(() => charactersTable.id, { onDelete: "cascade" }),
		strength: integer("strength").notNull().default(10),
		dexterity: integer("dexterity").notNull().default(10),
		constitution: integer("constitution").notNull().default(10),
		intelligence: integer("intelligence").notNull().default(10),
		wisdom: integer("wisdom").notNull().default(10),
		charisma: integer("charisma").notNull().default(10),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		check("character_attributes_strength_check", sql`${table.strength} BETWEEN 1 AND 30`),
		check("character_attributes_dexterity_check", sql`${table.dexterity} BETWEEN 1 AND 30`),
		check("character_attributes_constitution_check", sql`${table.constitution} BETWEEN 1 AND 30`),
		check("character_attributes_intelligence_check", sql`${table.intelligence} BETWEEN 1 AND 30`),
		check("character_attributes_wisdom_check", sql`${table.wisdom} BETWEEN 1 AND 30`),
		check("character_attributes_charisma_check", sql`${table.charisma} BETWEEN 1 AND 30`),
	],
);

export const characterProficienciesTable = pgTable(
	"character_proficiencies",
	{
		characterId: uuid("character_id")
			.notNull()
			.references(() => charactersTable.id, { onDelete: "cascade" }),
		category: text("category").notNull(),
		key: text("key").notNull(),
		rank: text("rank").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.characterId, table.category, table.key] }),
		check(
			"character_proficiencies_category_check",
			sql`${table.category} IN ('skill', 'saving-throw')`,
		),
		check(
			"character_proficiencies_rank_check",
			sql`(${table.category} = 'skill' AND ${table.rank} IN ('half', 'proficient', 'expertise')) OR (${table.category} = 'saving-throw' AND ${table.rank} = 'proficient')`,
		),
	],
);

export const characterHealthEventsTable = pgTable(
	"character_health_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		characterId: uuid("character_id")
			.notNull()
			.references(() => charactersTable.id, { onDelete: "cascade" }),
		previousCurrentHp: integer("previous_current_hp").notNull(),
		nextCurrentHp: integer("next_current_hp").notNull(),
		previousMaxHp: integer("previous_max_hp").notNull(),
		nextMaxHp: integer("next_max_hp").notNull(),
		previousTemporaryHp: integer("previous_temporary_hp").notNull(),
		nextTemporaryHp: integer("next_temporary_hp").notNull(),
		currentHpDelta: integer("current_hp_delta").notNull(),
		maxHpDelta: integer("max_hp_delta").notNull(),
		temporaryHpDelta: integer("temporary_hp_delta").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("character_health_events_character_created_idx").on(
			table.characterId,
			table.createdAt.desc(),
		),
	],
);

export const characterSpellSlotsTable = pgTable(
	"character_spell_slots",
	{
		characterId: uuid("character_id")
			.notNull()
			.references(() => charactersTable.id, { onDelete: "cascade" }),
		spellLevel: integer("spell_level").notNull(),
		totalSlots: integer("total_slots").notNull().default(0),
		usedSlots: integer("used_slots").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.characterId, table.spellLevel] }),
		index("character_spell_slots_character_idx").on(table.characterId),
	],
);

export const characterSpellSlotEventsTable = pgTable(
	"character_spell_slot_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		characterId: uuid("character_id")
			.notNull()
			.references(() => charactersTable.id, { onDelete: "cascade" }),
		action: text("action").$type<SpellSlotAction>().notNull(),
		spellLevel: integer("spell_level").notNull(),
		previousTotalSlots: integer("previous_total_slots").notNull(),
		nextTotalSlots: integer("next_total_slots").notNull(),
		previousUsedSlots: integer("previous_used_slots").notNull(),
		nextUsedSlots: integer("next_used_slots").notNull(),
		totalSlotsDelta: integer("total_slots_delta").notNull(),
		usedSlotsDelta: integer("used_slots_delta").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("character_spell_slot_events_character_created_idx").on(
			table.characterId,
			table.createdAt.desc(),
		),
	],
);

export const characterSpellsTable = pgTable(
	"character_spells",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		characterId: uuid("character_id")
			.notNull()
			.references(() => charactersTable.id, { onDelete: "cascade" }),
		slotLevel: integer("slot_level").notNull(),
		spellSource: text("spell_source").notNull().default("spell"),
		spellIndex: text("spell_index").notNull(),
		spellName: text("spell_name").notNull(),
		spellLevel: integer("spell_level").notNull(),
		spellUrl: text("spell_url").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("character_spells_character_level_idx").on(table.characterId, table.slotLevel),
		uniqueIndex("character_spells_character_slot_spell_idx").on(
			table.characterId,
			table.slotLevel,
			table.spellSource,
			table.spellIndex,
		),
	],
);
