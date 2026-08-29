import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";

describe("inventory history table", () => {
	it("matches the shared migration and paging index", () => {
		const migration = readFileSync("migrations/0013_inventory_items.sql", "utf8");

		expect(getTableName(inventoryHistoryEntriesTable)).toBe("inventory_history_entries");
		expect(inventoryHistoryEntriesTable.id.getSQLType()).toBe("uuid");
		expect(inventoryHistoryEntriesTable.inventoryScopeId.getSQLType()).toBe("uuid");
		expect(inventoryHistoryEntriesTable.details.getSQLType()).toBe("jsonb");
		expect(migration).toContain("inventory_history_entries_scope_created_idx");
		expect(migration).toContain("inventory_history_entries_inventory_scope_id_fkey");
	});
});
