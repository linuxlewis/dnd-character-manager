import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const characters = sqliteTable("characters", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	race: text("race").notNull(),
	class: text("class").notNull(),
	level: integer("level").notNull().default(1),
	ability_scores: text("ability_scores", { mode: "json" }),
	hp: text("hp", { mode: "json" }),
	spell_slots: text("spell_slots", { mode: "json" }),
	equipment: text("equipment", { mode: "json" }),
	skills: text("skills", { mode: "json" }),
	notes: text("notes"),
	created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
	updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

export const srdSpells = sqliteTable("srd_spells", {
	index: text("index").primaryKey(),
	name: text("name").notNull(),
	level: integer("level").notNull(),
	school: text("school").notNull(),
	casting_time: text("casting_time").notNull(),
	range: text("range").notNull(),
	duration: text("duration").notNull(),
	description: text("description").notNull(),
	classes: text("classes", { mode: "json" }).$type<string[]>().notNull(),
	cached_at: text("cached_at").notNull().default(sql`(datetime('now'))`),
});

export type SrdSpell = typeof srdSpells.$inferSelect;
export type NewSrdSpell = typeof srdSpells.$inferInsert;
