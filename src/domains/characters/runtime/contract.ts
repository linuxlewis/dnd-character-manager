import type { ApiRouteContract } from "@providers/openapi/index.js";
import { z } from "zod";
import {
	CharacterDetailResponseSchema,
	CharacterIdSchema,
	CreateCharacterRequestSchema,
	ListCharactersResponseSchema,
	UpdateCharacterHealthRequestSchema,
	UpdateCharacterHealthResponseSchema,
} from "../types/index.js";

export const ErrorResponseSchema = z.object({
	error: z.string(),
});

export const CharacterPathParamsSchema = z.object({
	characterId: CharacterIdSchema,
});

const characterTypeImports = [
	{
		kind: "type",
		module: "../domains/characters/types/index.js",
		names: [
			"CharacterDetailResponse",
			"CreateCharacterRequest",
			"ListCharactersResponse",
			"UpdateCharacterHealthRequest",
			"UpdateCharacterHealthResponse",
		],
	},
] as const;

const characterSchemaImports = [
	{
		kind: "value",
		module: "../domains/characters/types/index.js",
		names: [
			"CharacterDetailResponseSchema",
			"ListCharactersResponseSchema",
			"UpdateCharacterHealthResponseSchema",
		],
	},
] as const;

export const characterRouteContracts = [
	{
		method: "post",
		operationId: "createCharacter",
		path: "/api/characters",
		requestBody: CreateCharacterRequestSchema,
		responses: {
			201: { description: "Created character", schema: CharacterDetailResponseSchema },
			400: { description: "Invalid character data", schema: ErrorResponseSchema },
		},
		summary: "Create character",
		tags: ["characters"],
		client: {
			functionName: "createCharacter",
			imports: [...characterTypeImports, ...characterSchemaImports],
			requestBodyType: "CreateCharacterRequest",
			responseParser: "CharacterDetailResponseSchema",
			responseType: "CharacterDetailResponse",
		},
	},
	{
		method: "get",
		operationId: "listCharacters",
		path: "/api/characters",
		responses: {
			200: { description: "Characters", schema: ListCharactersResponseSchema },
		},
		summary: "List characters",
		tags: ["characters"],
		client: {
			functionName: "listCharacters",
			imports: [...characterTypeImports, ...characterSchemaImports],
			responseParser: "ListCharactersResponseSchema",
			responseType: "ListCharactersResponse",
		},
	},
	{
		method: "get",
		operationId: "getCharacter",
		path: "/api/characters/:characterId",
		pathParams: CharacterPathParamsSchema,
		responses: {
			200: { description: "Character detail", schema: CharacterDetailResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Get character",
		tags: ["characters"],
		client: {
			functionName: "getCharacter",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			responseParser: "CharacterDetailResponseSchema",
			responseType: "CharacterDetailResponse",
		},
	},
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
