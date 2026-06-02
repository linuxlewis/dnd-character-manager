import { userTable } from "@providers/auth/schema.js";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CharacterClass } from "../types/index.js";

export const characterTable = pgTable(
	"characters",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => userTable.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		characterClass: text("class").$type<CharacterClass>().notNull(),
		level: integer("level").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("characters_user_created_at_idx").on(table.userId, table.createdAt)],
);
