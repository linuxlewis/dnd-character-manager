import { describe, expect, it } from "vitest";
import { apiRouteContracts } from "./api-contracts.js";

describe("apiRouteContracts", () => {
	it("aggregates app route contracts for OpenAPI and client generation", () => {
		expect(apiRouteContracts).toHaveLength(1);
		expect(apiRouteContracts[0].operationId).toBe("getCurrentUser");
		expect(apiRouteContracts.every((route) => route.path.startsWith("/api/"))).toBe(true);
	});
});
