import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { catalogueItemSeedAuditsTable, catalogueItemsTable } from "./catalogue-item-table.js";

describe("catalogue item tables", () => {
	it("matches the C2 migration table names", () => {
		expect(getTableName(catalogueItemsTable)).toBe("catalogue_items");
		expect(getTableName(catalogueItemSeedAuditsTable)).toBe("catalogue_item_seed_audits");
	});

	it("keeps PostgreSQL real columns aligned with the Drizzle mapping", () => {
		const migration = readFileSync("migrations/0012_catalogue_items.sql", "utf8");

		expect(catalogueItemsTable.costValue.getSQLType()).toBe("real");
		expect(catalogueItemsTable.weight.getSQLType()).toBe("real");
		expect(migration).toMatch(/cost_value real CHECK/);
		expect(migration).toMatch(/weight real CHECK/);
		expect(migration).not.toMatch(/cost_value double precision|weight double precision/);
	});
});
