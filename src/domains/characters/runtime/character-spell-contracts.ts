import type { ApiRouteContract } from "@providers/openapi/index.js";
import {
	CharacterSpellDetailsResponseSchema,
	CharacterSpellsResponseSchema,
	SaveCharacterSpellRequestSchema,
	SearchCharacterSpellsRequestSchema,
	SearchCharacterSpellsResponseSchema,
} from "../types/index.js";
import {
	CharacterPathParamsSchema,
	CharacterSpellPathParamsSchema,
	characterSchemaImports,
	characterTypeImports,
	ErrorResponseSchema,
} from "./contract-support.js";

export const characterSpellRouteContracts = [
	{
		method: "get",
		operationId: "listCharacterSpells",
		path: "/api/characters/:characterId/spells",
		pathParams: CharacterPathParamsSchema,
		responses: {
			200: {
				description: "Saved character spells",
				schema: CharacterSpellsResponseSchema,
			},
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "List character spells",
		tags: ["characters"],
		client: {
			functionName: "listCharacterSpells",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			responseParser: "CharacterSpellsResponseSchema",
			responseType: "CharacterSpellsResponse",
		},
	},
	{
		method: "get",
		operationId: "getCharacterSpellDetails",
		path: "/api/characters/:characterId/spells/:spellId",
		pathParams: CharacterSpellPathParamsSchema,
		responses: {
			200: {
				description: "Saved character spell details",
				schema: CharacterSpellDetailsResponseSchema,
			},
			404: { description: "Character spell not found", schema: ErrorResponseSchema },
			502: { description: "D&D API unavailable", schema: ErrorResponseSchema },
		},
		summary: "Get character spell details",
		tags: ["characters"],
		client: {
			functionName: "getCharacterSpellDetails",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string; spellId: string }",
			responseParser: "CharacterSpellDetailsResponseSchema",
			responseType: "CharacterSpellDetailsResponse",
		},
	},
	{
		method: "post",
		operationId: "searchCharacterSpells",
		path: "/api/characters/:characterId/spells/search",
		pathParams: CharacterPathParamsSchema,
		requestBody: SearchCharacterSpellsRequestSchema,
		responses: {
			200: {
				description: "D&D spell search results",
				schema: SearchCharacterSpellsResponseSchema,
			},
			400: { description: "Invalid spell search data", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
			502: { description: "D&D API unavailable", schema: ErrorResponseSchema },
		},
		summary: "Search character spells",
		tags: ["characters"],
		client: {
			functionName: "searchCharacterSpells",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "SearchCharacterSpellsRequest",
			responseParser: "SearchCharacterSpellsResponseSchema",
			responseType: "SearchCharacterSpellsResponse",
		},
	},
	{
		method: "post",
		operationId: "saveCharacterSpell",
		path: "/api/characters/:characterId/spells",
		pathParams: CharacterPathParamsSchema,
		requestBody: SaveCharacterSpellRequestSchema,
		responses: {
			200: {
				description: "Saved character spell",
				schema: CharacterSpellsResponseSchema,
			},
			400: { description: "Invalid spell selection", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
			502: { description: "D&D API unavailable", schema: ErrorResponseSchema },
		},
		summary: "Save character spell",
		tags: ["characters"],
		client: {
			functionName: "saveCharacterSpell",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "SaveCharacterSpellRequest",
			responseParser: "CharacterSpellsResponseSchema",
			responseType: "CharacterSpellsResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
