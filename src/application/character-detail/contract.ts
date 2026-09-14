import type { ApiRouteContract } from "@providers/openapi/index.js";
import { z } from "zod";
import {
	CharacterIdSchema,
	UpdateCharacterExperienceRequestSchema,
	UpdateCharacterLevelRequestSchema,
	UpdateCharacterNameRequestSchema,
} from "../../domains/characters/types/index.js";
import { CharacterDetailResponseSchema, CreateCharacterRequestSchema } from "./types/index.js";

const CharacterPathParamsSchema = z.object({ characterId: CharacterIdSchema });
const characterTypeImports = [
	{
		kind: "type",
		module: "../application/character-detail/types/index.js",
		names: ["CharacterDetailResponse"],
	},
	{
		kind: "type",
		module: "../domains/characters/types/index.js",
		names: [
			"UpdateCharacterLevelRequest",
			"UpdateCharacterNameRequest",
			"UpdateCharacterExperienceRequest",
		],
	},
] as const;
const characterSchemaImports = [
	{
		kind: "value",
		module: "../application/character-detail/types/index.js",
		names: ["CharacterDetailResponseSchema"],
	},
] as const;
const ErrorResponseSchema = z.object({ error: z.string() });

export const characterDetailRouteContracts = [
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
			imports: [
				{
					kind: "type",
					module: "../application/character-detail/types/index.js",
					names: ["CreateCharacterRequest", "CharacterDetailResponse"],
				},
				{
					kind: "value",
					module: "../application/character-detail/types/index.js",
					names: ["CharacterDetailResponseSchema"],
				},
			],
			requestBodyType: "CreateCharacterRequest",
			responseParser: "CharacterDetailResponseSchema",
			responseType: "CharacterDetailResponse",
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
		operationId: "updateCharacterLevel",
		path: "/api/characters/:characterId/level",
		pathParams: CharacterPathParamsSchema,
		requestBody: UpdateCharacterLevelRequestSchema,
		responses: {
			200: { description: "Updated character level", schema: CharacterDetailResponseSchema },
			400: { description: "Invalid character level", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Update character level",
		tags: ["characters"],
		client: {
			functionName: "updateCharacterLevel",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "UpdateCharacterLevelRequest",
			responseParser: "CharacterDetailResponseSchema",
			responseType: "CharacterDetailResponse",
		},
	},
	{
		method: "put",
		operationId: "updateCharacterName",
		path: "/api/characters/:characterId/name",
		pathParams: CharacterPathParamsSchema,
		requestBody: UpdateCharacterNameRequestSchema,
		responses: {
			200: { description: "Updated character name", schema: CharacterDetailResponseSchema },
			400: { description: "Invalid character name", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Update character name",
		tags: ["characters"],
		client: {
			functionName: "updateCharacterName",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "UpdateCharacterNameRequest",
			responseParser: "CharacterDetailResponseSchema",
			responseType: "CharacterDetailResponse",
		},
	},
	{
		method: "put",
		operationId: "updateCharacterExperience",
		path: "/api/characters/:characterId/experience",
		pathParams: CharacterPathParamsSchema,
		requestBody: UpdateCharacterExperienceRequestSchema,
		responses: {
			200: { description: "Updated character experience", schema: CharacterDetailResponseSchema },
			400: { description: "Invalid character experience", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Update character experience",
		tags: ["characters"],
		client: {
			functionName: "updateCharacterExperience",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "UpdateCharacterExperienceRequest",
			responseParser: "CharacterDetailResponseSchema",
			responseType: "CharacterDetailResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
