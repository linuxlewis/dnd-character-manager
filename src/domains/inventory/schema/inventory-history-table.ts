import { userTable } from "@providers/auth/schema.js";
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { inventoryScopesTable } from "./inventory-scope-table.js";

export const inventoryHistoryEntriesTable = pgTable(
	"inventory_history_entries",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		inventoryScopeId: uuid("inventory_scope_id")
			.notNull()
			.references(() => inventoryScopesTable.id, { onDelete: "cascade" }),
		action: text("action").notNull(),
		entityType: text("entity_type").notNull(),
		entityId: uuid("entity_id"),
		entityName: text("entity_name"),
		actorUserId: uuid("actor_user_id").references(() => userTable.id, { onDelete: "set null" }),
		details: jsonb("details").$type<unknown>().notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		check(
			"inventory_history_entries_action_check",
			sql`${table.action} IN ('item_added', 'item_updated', 'item_removed', 'currency_updated')`,
		),
		check(
			"inventory_history_entries_entity_type_check",
			sql`${table.entityType} IN ('item', 'currency')`,
		),
		index("inventory_history_entries_scope_created_idx").on(
			table.inventoryScopeId,
			table.createdAt.desc(),
			table.id.desc(),
		),
	],
);
