import { describe, expect, it } from "vitest";
import { catalogueSpellsTable } from "./catalogue-spell-table.js";

describe("catalogueSpellsTable", () => {
	it("maps to the catalogue_spells table", () => {
		const tableMetadata = catalogueSpellsTable as unknown as Record<symbol, string>;
		expect(tableMetadata[Symbol.for("drizzle:Name")]).toBe("catalogue_spells");
	});
});
