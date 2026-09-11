import { z } from "zod";
import { CharacterIdSchema, CharacterSpellIdSchema } from "../types/index.js";

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
		module: "../domains/characters/types/index.js",
		names: [
			"CharacterDetailResponse",
			"CharacterAttributesResponse",
			"CharacterSpellDetailsResponse",
			"CharacterSpellsResponse",
			"CharacterSpellSlotsResponse",
			"CreateCharacterRequest",
			"CharacterAttributesUpdateRequest",
			"ListCharactersResponse",
			"RestoreCharacterSpellSlotRequest",
			"SaveCharacterSpellRequest",
			"SearchCharacterSpellsRequest",
			"SearchCharacterSpellsResponse",
			"UpdateCharacterExperienceRequest",
			"UpdateCharacterSpellSlotsRequest",
			"UpdateCharacterHealthRequest",
			"UpdateCharacterHealthResponse",
			"UpdateCharacterLevelRequest",
			"UpdateCharacterNameRequest",
			"UseCharacterSpellSlotRequest",
		],
	},
] as const;

export const characterSchemaImports = [
	{
		kind: "value",
		module: "../domains/characters/types/index.js",
		names: [
			"CharacterDetailResponseSchema",
			"CharacterAttributesResponseSchema",
			"CharacterSpellDetailsResponseSchema",
			"CharacterSpellsResponseSchema",
			"CharacterSpellSlotsResponseSchema",
			"ListCharactersResponseSchema",
			"SearchCharacterSpellsResponseSchema",
			"UpdateCharacterHealthResponseSchema",
		],
	},
] as const;
