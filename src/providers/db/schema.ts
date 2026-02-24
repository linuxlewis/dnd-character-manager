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
	armor_class: text("armor_class", { mode: "json" }).$type<{ base: number; override: number | null }>(),
	saving_throw_proficiencies: text("saving_throw_proficiencies", { mode: "json" }).$type<string[]>(),
	notes: text("notes"),
	created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
	updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
