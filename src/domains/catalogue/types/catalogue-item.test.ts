import { describe, expect, it } from "vitest";
import {
	CatalogueItemSearchQuerySchema,
	CatalogueItemSeedSchema,
	CatalogueItemSeedStatusSchema,
} from "./catalogue-item.js";

describe("catalogue item schemas", () => {
	it("applies safe defaults to typed search filters", () => {
		expect(CatalogueItemSearchQuerySchema.parse({ q: "rope" })).toEqual({ q: "rope", limit: 50 });
		expect(CatalogueItemSearchQuerySchema.parse({ isMagical: "false" })).toMatchObject({
			isMagical: false,
		});
	});

	it("requires complete item provenance and normalized fields", () => {
		expect(() => CatalogueItemSeedSchema.parse({ name: "Rope" })).toThrow();
	});

	it("models an unseeded capability explicitly", () => {
		expect(
			CatalogueItemSeedStatusSchema.parse({
				capability: "items",
				pack: "equipment24",
				readiness: "unavailable",
				seeded: false,
				count: 0,
				sourceRevision: null,
				audit: null,
			}),
		).toMatchObject({ readiness: "unavailable", seeded: false });
	});
});
