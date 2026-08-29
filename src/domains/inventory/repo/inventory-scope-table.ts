import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const inventoryScopesTable = pgTable(
	"inventory_scopes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		characterId: uuid("character_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex("inventory_scopes_character_id_unique").on(table.characterId)],
);
