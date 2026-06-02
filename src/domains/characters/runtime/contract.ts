import type { ApiRouteContract } from "@providers/openapi/index.js";
import {
	CharacterErrorResponseSchema,
	CharacterParamsSchema,
	CharacterResponseSchema,
	CreateCharacterSchema,
} from "../types/index.js";

const characterTypeImports = [
	{
		kind: "type",
		module: "../domains/characters/types/index.js",
		names: ["CharacterParams", "CharacterResponse", "CreateCharacter"],
	},
] as const;

const characterSchemaImports = [
	{
		kind: "value",
		module: "../domains/characters/types/index.js",
		names: ["CharacterResponseSchema"],
	},
] as const;

export const characterRouteContracts = [
	{
		method: "get",
		operationId: "listCharacters",
		path: "/api/characters",
		responses: {
			200: {
				description: "Characters available to the current session",
				schema: CharacterResponseSchema.array(),
			},
		},
		summary: "List characters",
		tags: ["characters"],
		client: {
			functionName: "listCharacters",
			imports: [...characterTypeImports, ...characterSchemaImports],
			responseParser: "CharacterResponseSchema.array()",
			responseType: "CharacterResponse[]",
		},
	},
	{
		method: "post",
		operationId: "createCharacter",
		path: "/api/characters",
		requestBody: CreateCharacterSchema,
		responses: {
			201: { description: "Created character", schema: CharacterResponseSchema },
			400: { description: "Invalid character data", schema: CharacterErrorResponseSchema },
		},
		summary: "Create character",
		tags: ["characters"],
		client: {
			functionName: "createCharacter",
			imports: [...characterTypeImports, ...characterSchemaImports],
			requestBodyType: "CreateCharacter",
			responseParser: "CharacterResponseSchema",
			responseType: "CharacterResponse",
		},
	},
	{
		method: "get",
		operationId: "getCharacter",
		path: "/api/characters/:id",
		pathParams: CharacterParamsSchema,
		responses: {
			200: { description: "Character", schema: CharacterResponseSchema },
			400: { description: "Invalid character id", schema: CharacterErrorResponseSchema },
			404: { description: "Character not found", schema: CharacterErrorResponseSchema },
		},
		summary: "Get character",
		tags: ["characters"],
		client: {
			functionName: "getCharacter",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "CharacterParams",
			responseParser: "CharacterResponseSchema",
			responseType: "CharacterResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
