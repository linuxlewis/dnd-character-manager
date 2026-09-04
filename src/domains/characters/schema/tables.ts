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
	uuid,
} from "drizzle-orm/pg-core";
import type { CharacterClass } from "../types/character-class.js";

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
