import { sql } from "drizzle-orm";
import { check, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { inventoryScopesTable } from "./inventory-scope-table.js";

export const inventoryTreasuriesTable = pgTable(
	"inventory_treasuries",
	{
		inventoryScopeId: uuid("inventory_scope_id")
			.primaryKey()
			.references(() => inventoryScopesTable.id, { onDelete: "cascade" }),
		copper: integer("copper").notNull().default(0),
		silver: integer("silver").notNull().default(0),
		gold: integer("gold").notNull().default(0),
		platinum: integer("platinum").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		check("inventory_treasuries_copper_nonnegative_check", sql`${table.copper} >= 0`),
		check("inventory_treasuries_silver_nonnegative_check", sql`${table.silver} >= 0`),
		check("inventory_treasuries_gold_nonnegative_check", sql`${table.gold} >= 0`),
		check("inventory_treasuries_platinum_nonnegative_check", sql`${table.platinum} >= 0`),
	],
);
