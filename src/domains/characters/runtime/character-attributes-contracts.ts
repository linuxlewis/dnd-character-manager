import type { ApiRouteContract } from "@providers/openapi/index.js";
import { z } from "zod";
import {
	CharacterAttributesResponseSchema,
	CharacterAttributesUpdateRequestSchema,
	CharacterIdSchema,
} from "../types/index.js";

const CharacterPathParamsSchema = z.object({ characterId: CharacterIdSchema });
const ErrorResponseSchema = z.object({ error: z.string() });
const characterTypeImports = [
	{
		kind: "type",
		module: "../domains/characters/types/index.js",
		names: ["CharacterAttributesResponse", "CharacterAttributesUpdateRequest"],
	},
] as const;
const characterSchemaImports = [
	{
		kind: "value",
		module: "../domains/characters/types/index.js",
		names: ["CharacterAttributesResponseSchema"],
	},
] as const;

export const characterAttributesRouteContracts = [
	{
		method: "get",
		operationId: "getCharacterAttributes",
		path: "/api/characters/:characterId/attributes",
		pathParams: CharacterPathParamsSchema,
		responses: {
			200: { description: "Character attributes", schema: CharacterAttributesResponseSchema },
			400: { description: "Invalid character path", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Get character attributes",
		tags: ["characters"],
		client: {
			functionName: "getCharacterAttributes",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			responseParser: "CharacterAttributesResponseSchema",
			responseType: "CharacterAttributesResponse",
		},
	},
	{
		method: "put",
		operationId: "updateCharacterAttributes",
		path: "/api/characters/:characterId/attributes",
		pathParams: CharacterPathParamsSchema,
		requestBody: CharacterAttributesUpdateRequestSchema,
		responses: {
			200: {
				description: "Updated character attributes",
				schema: CharacterAttributesResponseSchema,
			},
			400: { description: "Invalid character attributes", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Update character attributes",
		tags: ["characters"],
		client: {
			functionName: "updateCharacterAttributes",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "CharacterAttributesUpdateRequest",
			responseParser: "CharacterAttributesResponseSchema",
			responseType: "CharacterAttributesResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
