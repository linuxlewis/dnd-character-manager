import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { catalogueItemSeedAuditsTable, catalogueItemsTable } from "./catalogue-item-table.js";

describe("catalogue item tables", () => {
	it("matches the C2 migration table names", () => {
		expect(getTableName(catalogueItemsTable)).toBe("catalogue_items");
		expect(getTableName(catalogueItemSeedAuditsTable)).toBe("catalogue_item_seed_audits");
	});
});
