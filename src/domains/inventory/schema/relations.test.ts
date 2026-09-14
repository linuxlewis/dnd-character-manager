import { createTableRelationsHelpers, getTableName, Many, One } from "drizzle-orm";
import { expect, it } from "vitest";
import { inventoryItemsTable } from "./inventory-item-table.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";
import { inventoryItemRelations, inventoryScopeRelations } from "./relations.js";

it("keeps one scope per character with plural items/history and an optional treasury", () => {
	const relations = inventoryScopeRelations.config(
		createTableRelationsHelpers(inventoryScopesTable),
	);
	expect(relations.character).toBeInstanceOf(One);
	expect(getTableName(relations.character.referencedTable)).toBe("characters");
	expect(relations.treasury).toBeInstanceOf(One);
	expect(relations.items).toBeInstanceOf(Many);
	expect(relations.history).toBeInstanceOf(Many);
});

it("links a saved inventory item to its scope and optional catalogue source", () => {
	const relations = inventoryItemRelations.config(createTableRelationsHelpers(inventoryItemsTable));
	expect(getTableName(relations.scope.referencedTable)).toBe("inventory_scopes");
	expect(getTableName(relations.catalogueItem.referencedTable)).toBe("catalogue_items");
	expect(relations.catalogueItem.config?.fields.map((field) => field.name)).toEqual([
		"catalogue_item_id",
	]);
});
