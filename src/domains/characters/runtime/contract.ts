import type { ApiRouteContract } from "@providers/openapi/index.js";
import { ListCharactersResponseSchema } from "../types/index.js";
export const characterRouteContracts = [
	{
		method: "get",
		operationId: "listCharacters",
		path: "/api/characters",
		responses: { 200: { description: "Characters", schema: ListCharactersResponseSchema } },
		summary: "List characters",
		tags: ["characters"],
		client: {
			functionName: "listCharacters",
			imports: [
				{
					kind: "type",
					module: "../domains/characters/types/index.js",
					names: ["ListCharactersResponse"],
				},
				{
					kind: "value",
					module: "../domains/characters/types/index.js",
					names: ["ListCharactersResponseSchema"],
				},
			],
			responseParser: "ListCharactersResponseSchema",
			responseType: "ListCharactersResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
