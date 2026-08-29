import type { ApiRouteContract } from "@providers/openapi/index.js";
import { z } from "zod";
import {
	CatalogueItemDetailsSchema,
	CatalogueItemIdSchema,
	CatalogueItemSearchQuerySchema,
	CatalogueItemSearchResponseSchema,
	CatalogueItemsUnavailableResponseSchema,
	CatalogueStatusResponseSchema,
} from "../types/index.js";

const ErrorResponseSchema = z.object({ error: z.string() });
const catalogueTypeImports = [
	{
		kind: "type",
		module: "../domains/catalogue/types/index.js",
		names: [
			"CatalogueItemDetails",
			"CatalogueItemSearchQuery",
			"CatalogueItemSearchResponse",
			"CatalogueStatusResponse",
		],
	},
] as const;
const catalogueSchemaImports = [
	{
		kind: "value",
		module: "../domains/catalogue/types/index.js",
		names: [
			"CatalogueItemDetailsSchema",
			"CatalogueItemSearchQuerySchema",
			"CatalogueItemSearchResponseSchema",
			"CatalogueStatusResponseSchema",
		],
	},
] as const;

export const catalogueItemRouteContracts = [
	{
		method: "get",
		operationId: "searchCatalogueItems",
		path: "/api/catalogue/items",
		queryParams: CatalogueItemSearchQuerySchema,
		responses: {
			200: {
				description: "Catalogue item search results",
				schema: CatalogueItemSearchResponseSchema,
			},
			400: { description: "Invalid catalogue item search", schema: ErrorResponseSchema },
			503: {
				description: "Catalogue item data is not seeded",
				schema: CatalogueItemsUnavailableResponseSchema,
			},
		},
		summary: "Search catalogue items",
		tags: ["catalogue", "items"],
		client: {
			functionName: "searchCatalogueItems",
			imports: [...catalogueTypeImports, ...catalogueSchemaImports],
			queryParamsType: "CatalogueItemSearchQuery",
			responseParser: "CatalogueItemSearchResponseSchema",
			responseType: "CatalogueItemSearchResponse",
		},
	},
	{
		method: "get",
		operationId: "getCatalogueItemDetails",
		path: "/api/catalogue/items/:catalogueItemId",
		pathParams: z.object({ catalogueItemId: CatalogueItemIdSchema }),
		responses: {
			200: { description: "Catalogue item details", schema: CatalogueItemDetailsSchema },
			400: { description: "Invalid catalogue item id", schema: ErrorResponseSchema },
			404: { description: "Catalogue item not found", schema: ErrorResponseSchema },
			503: {
				description: "Catalogue item data is not seeded",
				schema: CatalogueItemsUnavailableResponseSchema,
			},
		},
		summary: "Get catalogue item details",
		tags: ["catalogue", "items"],
		client: {
			functionName: "getCatalogueItemDetails",
			imports: [...catalogueTypeImports, ...catalogueSchemaImports],
			pathParamsType: "{ catalogueItemId: string }",
			responseParser: "CatalogueItemDetailsSchema",
			responseType: "CatalogueItemDetails",
		},
	},
	{
		method: "get",
		operationId: "getCatalogueStatus",
		path: "/api/catalogue/status",
		responses: {
			200: {
				description: "Catalogue readiness and seed status",
				schema: CatalogueStatusResponseSchema,
			},
		},
		summary: "Get catalogue status",
		tags: ["catalogue"],
		client: {
			functionName: "getCatalogueStatus",
			imports: [...catalogueTypeImports, ...catalogueSchemaImports],
			responseParser: "CatalogueStatusResponseSchema",
			responseType: "CatalogueStatusResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
