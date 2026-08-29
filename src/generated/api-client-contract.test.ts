import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createGeneratedOutputs } from "../../scripts/openapi-generator.js";
import { apiRouteContracts } from "../api-contracts.js";
import {
	ApiClientError,
	apiClient,
	apiMutations,
	apiQueries,
	apiQueryKeys,
	createApiClient,
	createApiMutationOptions,
	createApiQueryOptions,
} from "./api-client.generated.js";

const root = process.cwd();

describe("generated API client", () => {
	it("keeps deterministic artifact topology and compatibility exports", () => {
		const first = createGeneratedOutputs(apiRouteContracts, root);
		const second = createGeneratedOutputs(apiRouteContracts, root);

		expect(second).toEqual(first);
		expect(first.map((output) => output.relativePath)).toEqual([
			"src/generated/openapi.generated.json",
			"src/generated/api-client-auth.generated.ts",
			"src/generated/api-client-characters.generated.ts",
			"src/generated/api-client-inventory.generated.ts",
			"src/generated/api-client-spells.generated.ts",
			"src/generated/api-client-errors.generated.ts",
			"src/generated/api-client-core.generated.ts",
			"src/generated/api-query-keys.generated.ts",
			"src/generated/api-query-options.generated.ts",
			"src/generated/api-mutation-options.generated.ts",
			"src/generated/api-types.generated.ts",
			"src/generated/api-client.generated.ts",
		]);
		expect(
			first
				.filter((output) => output.relativePath.endsWith(".ts"))
				.every((output) => output.content.split("\n").length < 300),
		).toBe(true);

		const barrel = first.find((output) => output.relativePath.endsWith("api-client.generated.ts"));
		expect(barrel?.content).toContain("export { apiClient, createApiClient }");
		expect(barrel?.content).toContain("export { apiQueryKeys }");
		expect(barrel?.content).toContain("export { apiQueries, createApiQueryOptions }");
		expect(barrel?.content).toContain("export { apiMutations, createApiMutationOptions }");
		expect(barrel?.content).toContain('export type * from "./api-types.generated.js";');
		const types = first.find((output) => output.relativePath.endsWith("api-types.generated.ts"));
		const inventoryClient = first.find((output) =>
			output.relativePath.endsWith("api-client-inventory.generated.ts"),
		);
		expect(types?.content).toContain("CharacterTreasuryPreviewResponse");
		expect(types?.content).toContain("AddCharacterTreasuryPreviewRequest");
		expect(types?.content).toContain("SpendCharacterTreasuryPreviewRequest");
		expect(types?.content).toContain("TreasuryConflictResponse");
		expect(inventoryClient?.content).toContain("body: AddCharacterTreasuryRequest");
		expect(inventoryClient?.content).toContain("body: AddCharacterTreasuryPreviewRequest");
		expect(inventoryClient?.content).toContain("body: SpendCharacterTreasuryRequest");
		expect(inventoryClient?.content).toContain("body: SpendCharacterTreasuryPreviewRequest");
	});

	it("preserves the public client, query, mutation, type, and error surfaces", () => {
		expect(createApiClient).toBeTypeOf("function");
		expect(apiClient.getCharacterTreasury).toBeTypeOf("function");
		expect(apiQueryKeys.getCharacterTreasury({ characterId: "character-1" })).toEqual([
			"api",
			"getCharacterTreasury",
			{ characterId: "character-1" },
		]);
		expect(apiQueries.getCharacterTreasury).toBeTypeOf("function");
		expect(apiMutations.spendCharacterTreasury).toBeTypeOf("function");
		expect(createApiQueryOptions).toBeTypeOf("function");
		expect(createApiMutationOptions).toBeTypeOf("function");
		expect(new ApiClientError(404, { error: "missing" })).toMatchObject({
			name: "ApiClientError",
			status: 404,
		});
	});

	it("does not rely on checked-in generated content for the topology assertion", () => {
		const output = readFileSync("src/generated/api-client.generated.ts", "utf8");
		expect(output).toContain("api-types.generated.js");
	});

	it("documents change only on the spend preview endpoint", () => {
		const openapiOutput = createGeneratedOutputs(apiRouteContracts, root).find(
			(output) => output.relativePath === "src/generated/openapi.generated.json",
		);
		const document = JSON.parse(openapiOutput?.content ?? "{}") as {
			paths?: Record<
				string,
				{
					post?: {
						responses?: Record<
							string,
							{
								content?: {
									"application/json"?: {
										schema?: {
											properties?: { preview?: { properties?: Record<string, unknown> } };
										};
									};
								};
							}
						>;
					};
				}
			>;
		};
		const addPreviewProperties =
			document.paths?.["/api/characters/{characterId}/treasury/preview/add"]?.post?.responses?.[
				"200"
			]?.content?.["application/json"]?.schema?.properties?.preview?.properties;
		const spendPreviewProperties =
			document.paths?.["/api/characters/{characterId}/treasury/preview/spend"]?.post?.responses?.[
				"200"
			]?.content?.["application/json"]?.schema?.properties?.preview?.properties;

		expect(addPreviewProperties).not.toHaveProperty("change");
		expect(spendPreviewProperties).toHaveProperty("change");
	});

	it("parses server-computed spend change through the generated client", async () => {
		const responseBody = {
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
		const fetchImpl = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		const client = createApiClient({ baseUrl: "http://example.test", fetch: fetchImpl });

		await expect(
			client.previewSpendCharacterTreasury(
				{ characterId: responseBody.treasury.characterId },
				{ amount: { denomination: "sp", amount: 5 } },
			),
		).resolves.toEqual(responseBody);
	});

	it("rejects leaked change from the generated add-preview client", async () => {
		const responseBody = {
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
				change: { cp: 1, sp: 0, gp: 0, pp: 0 },
			},
		};
		const fetchImpl = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		const client = createApiClient({ baseUrl: "http://example.test", fetch: fetchImpl });

		await expect(
			client.previewAddCharacterTreasury(
				{ characterId: responseBody.treasury.characterId },
				{ delta: { cp: 1, sp: 0, gp: 0, pp: 0 } },
			),
		).rejects.toThrow();
	});
});
