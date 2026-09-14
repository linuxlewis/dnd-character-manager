import { expect, it } from "vitest";
import { healthRouteContracts } from "./contract.js";

it("owns the unchanged health operation", () => {
	expect(healthRouteContracts).toHaveLength(1);
	expect(healthRouteContracts[0]).toMatchObject({
		method: "put",
		operationId: "updateCharacterHealth",
		path: "/api/characters/:characterId/health",
		client: {
			functionName: "updateCharacterHealth",
			responseType: "UpdateCharacterHealthResponse",
		},
	});
	expect(Object.keys(healthRouteContracts[0].responses)).toEqual(["200", "400", "404"]);
});
