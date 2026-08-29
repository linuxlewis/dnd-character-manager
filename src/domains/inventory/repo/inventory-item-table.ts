import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { inventoryScopesTable } from "./inventory-scope-table.js";

export const inventoryItemsTable = pgTable(
	"inventory_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		inventoryScopeId: uuid("inventory_scope_id")
			.notNull()
			.references(() => inventoryScopesTable.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		type: text("type").notNull(),
		category: text("category").notNull(),
		rarity: text("rarity"),
		description: text("description"),
		quantity: integer("quantity").notNull().default(1),
		weight: real("weight"),
		estimatedValue: real("estimated_value"),
		notes: text("notes"),
		thumbnailUrl: text("thumbnail_url"),
		catalogueItemId: uuid("catalogue_item_id"),
		catalogueSourceKey: text("catalogue_source_key"),
		catalogueRulesVersion: text("catalogue_rules_version"),
		properties: jsonb("properties").$type<unknown>().notNull().default({}),
		isEquipped: boolean("is_equipped").notNull().default(false),
		statModifiers: jsonb("stat_modifiers").$type<unknown>(),
		statOverrides: jsonb("stat_overrides").$type<unknown>(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		check("inventory_items_name_nonempty_check", sql`${table.name} <> ''`),
		check(
			"inventory_items_type_check",
			sql`${table.type} IN ('equipment', 'potion', 'scroll', 'consumable', 'misc')`,
		),
		check("inventory_items_category_nonempty_check", sql`${table.category} <> ''`),
		check(
			"inventory_items_rarity_check",
			sql`${table.rarity} IS NULL OR ${table.rarity} IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact')`,
		),
		check("inventory_items_quantity_positive_check", sql`${table.quantity} >= 1`),
		check(
			"inventory_items_weight_nonnegative_check",
			sql`${table.weight} IS NULL OR ${table.weight} >= 0`,
		),
		check(
			"inventory_items_estimated_value_nonnegative_check",
			sql`${table.estimatedValue} IS NULL OR ${table.estimatedValue} >= 0`,
		),
		index("inventory_items_scope_created_idx").on(
			table.inventoryScopeId,
			table.createdAt.desc(),
			table.id.desc(),
		),
		index("inventory_items_scope_type_category_idx").on(
			table.inventoryScopeId,
			table.type,
			table.category,
		),
		index("inventory_items_scope_type_idx").on(table.inventoryScopeId, table.type),
		index("inventory_items_scope_category_idx").on(table.inventoryScopeId, table.category),
		index("inventory_items_catalogue_item_id_idx").on(table.catalogueItemId),
		index("inventory_items_catalogue_source_key_idx").on(table.catalogueSourceKey),
	],
);
