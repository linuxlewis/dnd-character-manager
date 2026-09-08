import {
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { charactersTable } from "../../characters/schema/index.js";
import type { SpellSlotAction } from "../types/character.js";

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
