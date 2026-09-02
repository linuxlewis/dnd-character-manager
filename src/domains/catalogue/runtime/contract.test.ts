import { describe, expect, it } from "vitest";
import { catalogueItemRouteContracts } from "./contract.js";

describe("catalogue item route contracts", () => {
	it("exposes independent search, detail, and status operations", () => {
		expect(catalogueItemRouteContracts.map((route) => route.operationId)).toEqual([
			"searchCatalogueItems",
			"getCatalogueItemDetails",
			"getCatalogueStatus",
		]);
		expect(catalogueItemRouteContracts[0]).toMatchObject({ queryParams: expect.any(Object) });
	});
});
