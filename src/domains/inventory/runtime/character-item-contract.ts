import type { ApiRouteContract } from "@providers/openapi/index.js";
import {
	CharacterItemResponseSchema,
	CreateCharacterItemRequestSchema,
	ListCharacterItemsRequestSchema,
	ListCharacterItemsResponseSchema,
	UpdateCharacterItemRequestSchema,
} from "../types/index.js";
import {
	CharacterItemDetailPathParamsSchema,
	CharacterItemErrorResponseSchema,
	CharacterItemPathParamsSchema,
} from "./contract-support.js";

const characterItemTypeImports = [
	{
		kind: "type",
		module: "../domains/inventory/types/index.js",
		names: [
			"CharacterItemResponse",
			"CreateCharacterItemRequest",
			"ListCharacterItemsRequest",
			"ListCharacterItemsResponse",
			"UpdateCharacterItemRequest",
		],
	},
] as const;

const characterItemSchemaImports = [
	{
		kind: "value",
		module: "../domains/inventory/types/index.js",
		names: ["CharacterItemResponseSchema", "ListCharacterItemsResponseSchema"],
	},
] as const;

const characterItemErrors = {
	400: { description: "Invalid character item request", schema: CharacterItemErrorResponseSchema },
	404: { description: "Character or item not found", schema: CharacterItemErrorResponseSchema },
	500: {
		description: "Character item persistence failure",
		schema: CharacterItemErrorResponseSchema,
	},
} as const;

const catalogueItemErrors = {
	...characterItemErrors,
	503: {
		description: "Catalogue item data is unavailable",
		schema: CharacterItemErrorResponseSchema,
	},
} as const;

export const characterItemRouteContracts = [
	{
		method: "post",
		operationId: "createCharacterItem",
		path: "/api/characters/:characterId/items",
		pathParams: CharacterItemPathParamsSchema,
		requestBody: CreateCharacterItemRequestSchema,
		responses: {
			201: { description: "Created character item", schema: CharacterItemResponseSchema },
			...catalogueItemErrors,
		},
		summary: "Create character item",
		tags: ["characters", "items"],
		client: {
			functionName: "createCharacterItem",
			imports: [...characterItemTypeImports, ...characterItemSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "CreateCharacterItemRequest",
			responseParser: "CharacterItemResponseSchema",
			responseType: "CharacterItemResponse",
		},
	},
	{
		method: "get",
		operationId: "listCharacterItems",
		path: "/api/characters/:characterId/items",
		pathParams: CharacterItemPathParamsSchema,
		queryParams: ListCharacterItemsRequestSchema,
		responses: {
			200: { description: "Character items", schema: ListCharacterItemsResponseSchema },
			...characterItemErrors,
		},
		summary: "List character items",
		tags: ["characters", "items"],
		client: {
			functionName: "listCharacterItems",
			imports: [...characterItemTypeImports, ...characterItemSchemaImports],
			pathParamsType: "{ characterId: string }",
			queryParamsType: "ListCharacterItemsRequest",
			responseParser: "ListCharacterItemsResponseSchema",
			responseType: "ListCharacterItemsResponse",
		},
	},
	{
		method: "get",
		operationId: "getCharacterItemDetails",
		path: "/api/characters/:characterId/items/:itemId",
		pathParams: CharacterItemDetailPathParamsSchema,
		responses: {
			200: { description: "Character item", schema: CharacterItemResponseSchema },
			...characterItemErrors,
		},
		summary: "Get character item details",
		tags: ["characters", "items"],
		client: {
			functionName: "getCharacterItemDetails",
			imports: [...characterItemTypeImports, ...characterItemSchemaImports],
			pathParamsType: "{ characterId: string; itemId: string }",
			responseParser: "CharacterItemResponseSchema",
			responseType: "CharacterItemResponse",
		},
	},
	{
		method: "patch",
		operationId: "updateCharacterItem",
		path: "/api/characters/:characterId/items/:itemId",
		pathParams: CharacterItemDetailPathParamsSchema,
		requestBody: UpdateCharacterItemRequestSchema,
		responses: {
			200: { description: "Updated character item", schema: CharacterItemResponseSchema },
			...catalogueItemErrors,
		},
		summary: "Update character item",
		tags: ["characters", "items"],
		client: {
			functionName: "updateCharacterItem",
			imports: [...characterItemTypeImports, ...characterItemSchemaImports],
			pathParamsType: "{ characterId: string; itemId: string }",
			requestBodyType: "UpdateCharacterItemRequest",
			responseParser: "CharacterItemResponseSchema",
			responseType: "CharacterItemResponse",
		},
	},
	{
		method: "delete",
		operationId: "deleteCharacterItem",
		path: "/api/characters/:characterId/items/:itemId",
		pathParams: CharacterItemDetailPathParamsSchema,
		responses: {
			204: { description: "Character item deleted" },
			...characterItemErrors,
		},
		summary: "Delete character item",
		tags: ["characters", "items"],
		client: {
			functionName: "deleteCharacterItem",
			imports: [...characterItemTypeImports],
			pathParamsType: "{ characterId: string; itemId: string }",
			responseType: "void",
		},
	},
	{
		method: "post",
		operationId: "equipCharacterItem",
		path: "/api/characters/:characterId/items/:itemId/equip",
		pathParams: CharacterItemDetailPathParamsSchema,
		responses: {
			200: { description: "Equipped character item", schema: CharacterItemResponseSchema },
			...characterItemErrors,
		},
		summary: "Equip character item",
		tags: ["characters", "items"],
		client: {
			functionName: "equipCharacterItem",
			imports: [...characterItemTypeImports, ...characterItemSchemaImports],
			pathParamsType: "{ characterId: string; itemId: string }",
			responseParser: "CharacterItemResponseSchema",
			responseType: "CharacterItemResponse",
		},
	},
	{
		method: "post",
		operationId: "unequipCharacterItem",
		path: "/api/characters/:characterId/items/:itemId/unequip",
		pathParams: CharacterItemDetailPathParamsSchema,
		responses: {
			200: { description: "Unequipped character item", schema: CharacterItemResponseSchema },
			...characterItemErrors,
		},
		summary: "Unequip character item",
		tags: ["characters", "items"],
		client: {
			functionName: "unequipCharacterItem",
			imports: [...characterItemTypeImports, ...characterItemSchemaImports],
			pathParamsType: "{ characterId: string; itemId: string }",
			responseParser: "CharacterItemResponseSchema",
			responseType: "CharacterItemResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
