import type { ApiRouteContract } from "@providers/openapi/index.js";
import { z } from "zod";
import { CharacterIdSchema } from "../../characters/types/index.js";
import {
	UpdateCharacterHealthRequestSchema,
	UpdateCharacterHealthResponseSchema,
} from "../types/index.js";

const CharacterPathParamsSchema = z.object({ characterId: CharacterIdSchema });
const ErrorResponseSchema = z.object({ error: z.string() });
const characterTypeImports = [
	{
		kind: "type",
		module: "../domains/health/types/index.js",
		names: ["UpdateCharacterHealthRequest", "UpdateCharacterHealthResponse"],
	},
] as const;
const characterSchemaImports = [
	{
		kind: "value",
		module: "../domains/health/types/index.js",
		names: ["UpdateCharacterHealthResponseSchema"],
	},
] as const;
export const healthRouteContracts = [
	{
		method: "put",
		operationId: "updateCharacterHealth",
		path: "/api/characters/:characterId/health",
		pathParams: CharacterPathParamsSchema,
		requestBody: UpdateCharacterHealthRequestSchema,
		responses: {
			200: {
				description: "Updated character health",
				schema: UpdateCharacterHealthResponseSchema,
			},
			400: { description: "Invalid health data", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Update character health",
		tags: ["characters"],
		client: {
			functionName: "updateCharacterHealth",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "UpdateCharacterHealthRequest",
			responseParser: "UpdateCharacterHealthResponseSchema",
			responseType: "UpdateCharacterHealthResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
