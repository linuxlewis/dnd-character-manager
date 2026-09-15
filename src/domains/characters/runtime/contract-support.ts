import { z } from "zod";
import { CharacterIdSchema } from "../types/index.js";

export const ErrorResponseSchema = z.object({ error: z.string() });

export const CharacterPathParamsSchema = z.object({ characterId: CharacterIdSchema });

export const characterTypeImports = [
	{
		kind: "type",
		module: "../domains/characters/types/index.js",
		names: ["CharacterAttributesResponse", "CharacterAttributesUpdateRequest"],
	},
] as const;

export const characterSchemaImports = [
	{
		kind: "value",
		module: "../domains/characters/types/index.js",
		names: ["CharacterAttributesResponseSchema"],
	},
] as const;
