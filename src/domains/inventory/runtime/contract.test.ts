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
		expect(inventoryTreasuryRouteContracts[1].responses[409]?.schema).toBeDefined();
		expect(inventoryTreasuryRouteContracts[2].responses[200]?.schema).toBeDefined();
		expect(inventoryTreasuryRouteContracts[2].responses[409]?.schema).toBeDefined();
		expect(inventoryTreasuryRouteContracts[3].responses[409]?.schema).toBeDefined();
	});

	it("requires preview state only on add and spend confirmations", () => {
		const add = inventoryTreasuryRouteContracts.find(
			(route) => route.operationId === "addCharacterTreasury",
		);
		const spend = inventoryTreasuryRouteContracts.find(
			(route) => route.operationId === "spendCharacterTreasury",
		);
		const convert = inventoryTreasuryRouteContracts.find(
			(route) => route.operationId === "convertCharacterTreasury",
		);
		const previewAdd = inventoryTreasuryRouteContracts.find(
			(route) => route.operationId === "previewAddCharacterTreasury",
		);
		const previewSpend = inventoryTreasuryRouteContracts.find(
			(route) => route.operationId === "previewSpendCharacterTreasury",
		);
		const previous = { cp: 0, sp: 0, gp: 0, pp: 0 };

		expect(add?.requestBody?.safeParse({ delta: previous }).success).toBe(false);
		expect(
			add?.requestBody?.safeParse({ delta: { ...previous, cp: 1 }, expectedPrevious: previous })
				.success,
		).toBe(true);
		expect(
			add?.requestBody?.safeParse({
				delta: { ...previous, cp: 1 },
				expectedPrevious: previous,
				note: "  Reward  ",
			}).success,
		).toBe(true);
		expect(
			spend?.requestBody?.safeParse({ amount: { denomination: "cp", amount: 1 } }).success,
		).toBe(false);
		expect(
			spend?.requestBody?.safeParse({
				amount: { denomination: "cp", amount: 1 },
				expectedPrevious: previous,
				note: "  Bought supplies  ",
			}).success,
		).toBe(true);
		expect(
			convert?.requestBody?.safeParse({
				from: "pp",
				to: "gp",
				amount: 1,
				note: "  Converted coins  ",
			}).success,
		).toBe(true);
		expect(previewAdd?.requestBody?.safeParse({ delta: { ...previous, cp: 1 } }).success).toBe(
			true,
		);
		expect(
			previewAdd?.requestBody?.safeParse({ delta: { ...previous, cp: 1 }, note: "Reward" }).success,
		).toBe(false);
		expect(
			previewSpend?.requestBody?.safeParse({ amount: { denomination: "cp", amount: 1 } }).success,
		).toBe(true);
		expect(previewAdd?.client?.requestBodyType).toBe("AddCharacterTreasuryPreviewRequest");
		expect(previewSpend?.client?.requestBodyType).toBe("SpendCharacterTreasuryPreviewRequest");
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

	it("keeps add and spend preview response contracts route-specific", () => {
		const addRoute = inventoryTreasuryRouteContracts.find(
			(route) => route.operationId === "previewAddCharacterTreasury",
		);
		const spendRoute = inventoryTreasuryRouteContracts.find(
			(route) => route.operationId === "previewSpendCharacterTreasury",
		);
		const addPreview = {
			treasury: {
				characterId: "00000000-0000-4000-8000-000000000020",
				balances: { cp: 0, sp: 0, gp: 0, pp: 0 },
				totalValue: { copper: 0, gp: 0 },
			},
			preview: {
				operation: "add",
				previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
				next: { cp: 1, sp: 0, gp: 0, pp: 0 },
				delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
				totalValue: { copper: 1, gp: 0.01 },
				canApply: true,
			},
		};

		expect(() =>
			addRoute?.responses[200]?.schema?.parse({
				...addPreview,
				preview: { ...addPreview.preview, change: { cp: 1, sp: 0, gp: 0, pp: 0 } },
			}),
		).toThrow();
		expect(spendRoute?.client?.responseType).toBe("SpendCharacterTreasuryPreviewResponse");
		expect(addRoute?.client?.responseType).toBe("AddCharacterTreasuryPreviewResponse");
	});
});
