import { userTable } from "@providers/auth/schema.js";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
