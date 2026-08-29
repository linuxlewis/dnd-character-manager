import { describe, expect, it } from "vitest";
import { inventoryTreasuryRouteContracts } from "./contract.js";

describe("inventoryTreasuryRouteContracts", () => {
	it("keeps operation IDs and generated client names stable", () => {
		expect(inventoryTreasuryRouteContracts.map((route) => route.operationId)).toEqual([
			"getCharacterTreasury",
			"addCharacterTreasury",
			"spendCharacterTreasury",
			"convertCharacterTreasury",
			"previewAddCharacterTreasury",
			"previewSpendCharacterTreasury",
		]);
		expect(inventoryTreasuryRouteContracts.map((route) => route.client?.functionName)).toEqual([
			"getCharacterTreasury",
			"addCharacterTreasury",
			"spendCharacterTreasury",
			"convertCharacterTreasury",
			"previewAddCharacterTreasury",
			"previewSpendCharacterTreasury",
		]);
	});

	it("preserves documented paths and typed error responses", () => {
		expect(inventoryTreasuryRouteContracts.map((route) => `${route.method} ${route.path}`)).toEqual(
			[
				"get /api/characters/:characterId/treasury",
				"put /api/characters/:characterId/treasury",
				"post /api/characters/:characterId/treasury/spend",
				"post /api/characters/:characterId/treasury/convert",
				"post /api/characters/:characterId/treasury/preview/add",
				"post /api/characters/:characterId/treasury/preview/spend",
			],
		);
		expect(inventoryTreasuryRouteContracts.every((route) => route.pathParams)).toBe(true);
		expect(inventoryTreasuryRouteContracts[1].requestBody).toBeDefined();
		expect(inventoryTreasuryRouteContracts[2].requestBody).toBeDefined();
		expect(inventoryTreasuryRouteContracts[3].requestBody).toBeDefined();
		expect(inventoryTreasuryRouteContracts[1].responses[200]?.schema).toBeDefined();
		expect(inventoryTreasuryRouteContracts[2].responses[200]?.schema).toBeDefined();
		expect(inventoryTreasuryRouteContracts[2].responses[409]?.schema).toBeDefined();
		expect(inventoryTreasuryRouteContracts[3].responses[409]?.schema).toBeDefined();
	});
});
