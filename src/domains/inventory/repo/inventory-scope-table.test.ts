import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { inventoryScopesTable } from "./inventory-scope-table.js";

describe("inventoryScopesTable", () => {
	it("maps character-owned scopes to the expected table", () => {
		expect(getTableName(inventoryScopesTable)).toBe("inventory_scopes");
	});
});
