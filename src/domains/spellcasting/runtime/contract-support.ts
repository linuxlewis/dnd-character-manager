import { z } from "zod";
import { CharacterIdSchema } from "../../characters/types/index.js";
import { CharacterSpellIdSchema } from "../types/index.js";

export const ErrorResponseSchema = z.object({
	error: z.string(),
});

export const CharacterPathParamsSchema = z.object({
	characterId: CharacterIdSchema,
});

export const CharacterSpellPathParamsSchema = z.object({
	characterId: CharacterIdSchema,
	spellId: CharacterSpellIdSchema,
});

export const characterTypeImports = [
	{
		kind: "type",
		module: "../domains/spellcasting/types/index.js",
		names: [
			"CharacterSpellDetailsResponse",
			"CharacterSpellsResponse",
			"CharacterSpellSlotsResponse",
			"RestoreCharacterSpellSlotRequest",
			"SaveCharacterSpellRequest",
			"SearchCharacterSpellsRequest",
			"SearchCharacterSpellsResponse",
			"UpdateCharacterSpellSlotsRequest",
			"UseCharacterSpellSlotRequest",
		],
	},
] as const;

export const characterSchemaImports = [
	{
		kind: "value",
		module: "../domains/spellcasting/types/index.js",
		names: [
			"CharacterSpellDetailsResponseSchema",
			"CharacterSpellsResponseSchema",
			"CharacterSpellSlotsResponseSchema",
			"SearchCharacterSpellsResponseSchema",
		],
	},
] as const;
