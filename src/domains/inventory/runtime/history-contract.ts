import type { ApiRouteContract } from "@providers/openapi/index.js";
import {
	ListCharacterHistoryRequestSchema,
	ListCharacterHistoryResponseSchema,
} from "../types/index.js";
import {
	CharacterHistoryErrorResponseSchema,
	CharacterHistoryPathParamsSchema,
} from "./contract-support.js";

const characterHistoryTypeImports = [
	{
		kind: "type",
		module: "../domains/inventory/types/index.js",
		names: ["ListCharacterHistoryRequest", "ListCharacterHistoryResponse"],
	},
] as const;

const characterHistorySchemaImports = [
	{
		kind: "value",
		module: "../domains/inventory/types/index.js",
		names: [
			"ListCharacterHistoryResponseCompatibilityParser",
			"ListCharacterHistoryResponseSchema",
		],
	},
] as const;

export const characterHistoryRouteContracts = [
	{
		method: "get",
		operationId: "listCharacterHistory",
		path: "/api/characters/:characterId/history",
		pathParams: CharacterHistoryPathParamsSchema,
		queryParams: ListCharacterHistoryRequestSchema,
		responses: {
			200: {
				description: "Character inventory history",
				schema: ListCharacterHistoryResponseSchema,
			},
			400: {
				description: "Invalid character history request",
				schema: CharacterHistoryErrorResponseSchema,
			},
			404: { description: "Character not found", schema: CharacterHistoryErrorResponseSchema },
			500: {
				description: "Character history persistence failure",
				schema: CharacterHistoryErrorResponseSchema,
			},
		},
		summary: "List character inventory history",
		tags: ["characters", "history"],
		client: {
			functionName: "listCharacterHistory",
			imports: [...characterHistoryTypeImports, ...characterHistorySchemaImports],
			pathParamsType: "{ characterId: string }",
			queryParamsType: "ListCharacterHistoryRequest",
			responseParser: "ListCharacterHistoryResponseCompatibilityParser",
			responseType: "ListCharacterHistoryResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
