import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
});
