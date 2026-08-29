import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { inventoryTreasuriesTable } from "./inventory-treasury-table.js";

describe("inventoryTreasuriesTable", () => {
	it("maps treasuries to the expected table", () => {
		expect(getTableName(inventoryTreasuriesTable)).toBe("inventory_treasuries");
	});
});
