import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { inventoryItemsTable } from "./inventory-item-table.js";

describe("inventory item table", () => {
	it("matches the shared migration table and physical column types", () => {
		const migration = readFileSync("migrations/0013_inventory_items.sql", "utf8");

		expect(getTableName(inventoryItemsTable)).toBe("inventory_items");
		expect(inventoryItemsTable.id.getSQLType()).toBe("uuid");
		expect(inventoryItemsTable.inventoryScopeId.getSQLType()).toBe("uuid");
		expect(inventoryItemsTable.quantity.getSQLType()).toBe("integer");
		expect(inventoryItemsTable.weight.getSQLType()).toBe("real");
		expect(inventoryItemsTable.estimatedValue.getSQLType()).toBe("real");
		expect(inventoryItemsTable.properties.getSQLType()).toBe("jsonb");
		expect(inventoryItemsTable.statModifiers.getSQLType()).toBe("jsonb");
		expect(inventoryItemsTable.statOverrides.getSQLType()).toBe("jsonb");
		expect(migration).toContain("ON DELETE SET NULL");
		expect(migration).toContain("inventory_items_scope_type_category_idx");
		expect(migration).toContain("inventory_items_catalogue_source_key_idx");
	});
});
