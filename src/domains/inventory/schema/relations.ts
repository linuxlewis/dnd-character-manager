import { relations } from "drizzle-orm";
import { userTable } from "../../../providers/auth/schema.js";
import { catalogueItemsTable } from "../../catalogue/schema/index.js";
import { charactersTable } from "../../characters/schema/index.js";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";
import { inventoryItemsTable } from "./inventory-item-table.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";
import { inventoryTreasuriesTable } from "./inventory-treasury-table.js";

export const inventoryScopeRelations = relations(inventoryScopesTable, ({ one, many }) => ({
	character: one(charactersTable, {
		fields: [inventoryScopesTable.characterId],
		references: [charactersTable.id],
	}),
	treasury: one(inventoryTreasuriesTable),
	items: many(inventoryItemsTable),
	history: many(inventoryHistoryEntriesTable),
}));

export const inventoryTreasuryRelations = relations(inventoryTreasuriesTable, ({ one }) => ({
	scope: one(inventoryScopesTable, {
		fields: [inventoryTreasuriesTable.inventoryScopeId],
		references: [inventoryScopesTable.id],
	}),
}));

export const inventoryItemRelations = relations(inventoryItemsTable, ({ one }) => ({
	scope: one(inventoryScopesTable, {
		fields: [inventoryItemsTable.inventoryScopeId],
		references: [inventoryScopesTable.id],
	}),
	catalogueItem: one(catalogueItemsTable, {
		fields: [inventoryItemsTable.catalogueItemId],
		references: [catalogueItemsTable.id],
	}),
}));

export const inventoryHistoryRelations = relations(inventoryHistoryEntriesTable, ({ one }) => ({
	scope: one(inventoryScopesTable, {
		fields: [inventoryHistoryEntriesTable.inventoryScopeId],
		references: [inventoryScopesTable.id],
	}),
	actor: one(userTable, {
		fields: [inventoryHistoryEntriesTable.actorUserId],
		references: [userTable.id],
	}),
}));
