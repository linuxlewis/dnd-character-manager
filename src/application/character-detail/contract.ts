import type { ApiRouteContract } from "@providers/openapi/index.js";
import { z } from "zod";
import {
	CharacterDetailResponseSchema,
	CreateCharacterRequestSchema,
} from "../../domains/characters/types/index.js";

const ErrorResponseSchema = z.object({ error: z.string() });

export const characterCreationRouteContracts = [
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
					module: "../domains/characters/types/index.js",
					names: ["CreateCharacterRequest", "CharacterDetailResponse"],
				},
				{
					kind: "value",
					module: "../domains/characters/types/index.js",
					names: ["CharacterDetailResponseSchema"],
				},
			],
			requestBodyType: "CreateCharacterRequest",
			responseParser: "CharacterDetailResponseSchema",
			responseType: "CharacterDetailResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
