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

	it("keeps server-computed spend change in the preview response schema", () => {
		const preview = {
			treasury: {
				characterId: "00000000-0000-4000-8000-000000000020",
				balances: { cp: 0, sp: 0, gp: 1, pp: 0 },
				totalValue: { copper: 100, gp: 1 },
			},
			preview: {
				operation: "spend",
				previous: { cp: 0, sp: 0, gp: 1, pp: 0 },
				next: { cp: 0, sp: 5, gp: 0, pp: 0 },
				delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
				totalValue: { copper: 50, gp: 0.5 },
				canApply: true,
				change: { cp: 0, sp: 5, gp: 0, pp: 0 },
			},
		};
		const schema = inventoryTreasuryRouteContracts.find(
			(route) => route.operationId === "previewSpendCharacterTreasury",
		)?.responses[200]?.schema;

		expect(schema?.parse(preview)).toEqual(preview);
	});
});
