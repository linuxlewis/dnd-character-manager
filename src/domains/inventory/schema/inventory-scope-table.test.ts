import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { inventoryScopesTable } from "./inventory-scope-table.js";

describe("inventoryScopesTable", () => {
	it("maps character-owned scopes to the expected table", () => {
		expect(getTableName(inventoryScopesTable)).toBe("inventory_scopes");
		const [foreignKey] = getTableConfig(inventoryScopesTable).foreignKeys;
		const migration = readFileSync("migrations/0011_inventory_scopes_and_treasuries.sql", "utf8");
		expect(foreignKey.getName()).toBe("inventory_scopes_character_id_fkey");
		expect(migration).toContain(`CONSTRAINT ${foreignKey.getName()}`);
		expect(migration).toContain("REFERENCES characters (id) ON DELETE CASCADE");
		expect(getTableName(foreignKey.reference().foreignTable)).toBe("characters");
		expect(foreignKey.onDelete).toBe("cascade");
	});
});
