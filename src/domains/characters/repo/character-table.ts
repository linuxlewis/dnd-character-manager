import { userTable } from "@providers/auth/schema.js";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CharacterClass } from "../types/index.js";

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
