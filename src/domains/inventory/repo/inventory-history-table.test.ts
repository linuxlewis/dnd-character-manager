import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";

describe("inventory history table", () => {
	it("matches the shared migration and paging index", () => {
		const migration = readFileSync("migrations/0013_inventory_items.sql", "utf8");
		const checks = getTableConfig(inventoryHistoryEntriesTable).checks;

		expect(getTableName(inventoryHistoryEntriesTable)).toBe("inventory_history_entries");
		expect(inventoryHistoryEntriesTable.id.getSQLType()).toBe("uuid");
		expect(inventoryHistoryEntriesTable.inventoryScopeId.getSQLType()).toBe("uuid");
		expect(inventoryHistoryEntriesTable.details.getSQLType()).toBe("jsonb");
		expect(checks.map((constraint) => constraint.name)).toEqual(
			expect.arrayContaining([
				"inventory_history_entries_action_check",
				"inventory_history_entries_entity_type_check",
			]),
		);
		expect(migration).toContain(
			"action text NOT NULL CHECK (action IN ('item_added', 'item_updated', 'item_removed', 'currency_updated'))",
		);
		expect(migration).toContain(
			"entity_type text NOT NULL CHECK (entity_type IN ('item', 'currency'))",
		);
		expect(migration).toContain("inventory_history_entries_scope_created_idx");
		expect(migration).toContain("inventory_history_entries_inventory_scope_id_fkey");
	});
});
