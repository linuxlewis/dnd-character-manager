import type { ApiClientContract, ApiRouteContract } from "@providers/openapi/index.js";
import { describe, expect, it } from "vitest";
import {
	identifiersReferencedBy,
	mergeUsedImports,
	methodParameters,
	pathTemplate,
} from "./openapi-generator-support.js";

const client: ApiClientContract = {
	functionName: "previewAddCharacterTreasury",
	imports: [
		{
			kind: "type",
			module: "../domains/inventory/types/index.js",
			names: ["AddCharacterTreasuryPreviewResponse", "CharacterTreasuryPreviewResponse"],
		},
		{
			kind: "value",
			module: "../domains/inventory/types/index.js",
			names: [
				"AddCharacterTreasuryPreviewResponseSchema",
				"CharacterTreasuryPreviewResponseSchema",
			],
		},
	],
	pathParamsType: "{ characterId: string }",
	responseParser: "AddCharacterTreasuryPreviewResponseSchema",
	responseType: "AddCharacterTreasuryPreviewResponse",
};

const route: ApiRouteContract = {
	method: "get",
	operationId: "previewAddCharacterTreasury",
	path: "/api/characters/:characterId/treasury/preview/add",
	responses: { 200: { description: "Preview" } },
	summary: "Preview",
	client,
};

describe("openapi generator support", () => {
	it("matches complete identifiers without leaking compatibility names", () => {
		expect(identifiersReferencedBy(client.responseType, client)).toEqual([
			"AddCharacterTreasuryPreviewResponse",
		]);
		expect(identifiersReferencedBy(client.responseParser, client, "value")).toEqual([
			"AddCharacterTreasuryPreviewResponseSchema",
		]);

		const imports = mergeUsedImports([route], (routeClient) => [
			...identifiersReferencedBy(routeClient.responseType, routeClient),
			...identifiersReferencedBy(routeClient.responseParser, routeClient, "value"),
		]);
		expect(imports).toContain("AddCharacterTreasuryPreviewResponse");
		expect(imports).toContain("AddCharacterTreasuryPreviewResponseSchema");
		expect(imports).not.toMatch(/\n\tCharacterTreasuryPreviewResponse,/);
		expect(imports).not.toMatch(/\n\tCharacterTreasuryPreviewResponseSchema,/);
	});

	it("builds deterministic path and parameter expressions", () => {
		expect(pathTemplate(route.path)).toBe(
			`\`/api/characters/\${params.characterId}/treasury/preview/add\``,
		);
		expect(methodParameters(client)).toBe(
			"params: { characterId: string }, options: ApiRequestOptions = {}",
		);
	});
});
