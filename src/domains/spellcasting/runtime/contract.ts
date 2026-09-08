import type { ApiRouteContract } from "@providers/openapi/index.js";
import {
	CharacterSpellSlotsResponseSchema,
	RestoreCharacterSpellSlotRequestSchema,
	UpdateCharacterSpellSlotsRequestSchema,
	UseCharacterSpellSlotRequestSchema,
} from "../types/index.js";
import { characterSpellRouteContracts } from "./character-spell-contracts.js";
import {
	CharacterPathParamsSchema,
	characterSchemaImports,
	characterTypeImports,
	ErrorResponseSchema,
} from "./contract-support.js";

export const spellcastingRouteContracts = [
	{
		method: "get",
		operationId: "getCharacterSpellSlots",
		path: "/api/characters/:characterId/spell-slots",
		pathParams: CharacterPathParamsSchema,
		responses: {
			200: {
				description: "Character spell slots",
				schema: CharacterSpellSlotsResponseSchema,
			},
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Get character spell slots",
		tags: ["characters"],
		client: {
			functionName: "getCharacterSpellSlots",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			responseParser: "CharacterSpellSlotsResponseSchema",
			responseType: "CharacterSpellSlotsResponse",
		},
	},
	{
		method: "put",
		operationId: "updateCharacterSpellSlots",
		path: "/api/characters/:characterId/spell-slots",
		pathParams: CharacterPathParamsSchema,
		requestBody: UpdateCharacterSpellSlotsRequestSchema,
		responses: {
			200: {
				description: "Updated character spell slots",
				schema: CharacterSpellSlotsResponseSchema,
			},
			400: { description: "Invalid spell slot data", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Update character spell slots",
		tags: ["characters"],
		client: {
			functionName: "updateCharacterSpellSlots",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "UpdateCharacterSpellSlotsRequest",
			responseParser: "CharacterSpellSlotsResponseSchema",
			responseType: "CharacterSpellSlotsResponse",
		},
	},
	{
		method: "post",
		operationId: "useCharacterSpellSlot",
		path: "/api/characters/:characterId/spell-slots/use",
		pathParams: CharacterPathParamsSchema,
		requestBody: UseCharacterSpellSlotRequestSchema,
		responses: {
			200: { description: "Used character spell slot", schema: CharacterSpellSlotsResponseSchema },
			400: { description: "Spell slot unavailable", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Use character spell slot",
		tags: ["characters"],
		client: {
			functionName: "useCharacterSpellSlot",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "UseCharacterSpellSlotRequest",
			responseParser: "CharacterSpellSlotsResponseSchema",
			responseType: "CharacterSpellSlotsResponse",
		},
	},
	{
		method: "post",
		operationId: "restoreCharacterSpellSlot",
		path: "/api/characters/:characterId/spell-slots/restore",
		pathParams: CharacterPathParamsSchema,
		requestBody: RestoreCharacterSpellSlotRequestSchema,
		responses: {
			200: {
				description: "Restored character spell slot",
				schema: CharacterSpellSlotsResponseSchema,
			},
			400: { description: "Spell slot unavailable", schema: ErrorResponseSchema },
			404: { description: "Character not found", schema: ErrorResponseSchema },
		},
		summary: "Restore character spell slot",
		tags: ["characters"],
		client: {
			functionName: "restoreCharacterSpellSlot",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			requestBodyType: "RestoreCharacterSpellSlotRequest",
			responseParser: "CharacterSpellSlotsResponseSchema",
			responseType: "CharacterSpellSlotsResponse",
		},
	},
	{
		method: "post",
		operationId: "applyCharacterSpellSlotDefaults",
		path: "/api/characters/:characterId/spell-slots/apply-defaults",
		pathParams: CharacterPathParamsSchema,
		responses: {
			200: {
				description: "Applied D&D API spell slot defaults",
				schema: CharacterSpellSlotsResponseSchema,
			},
			404: { description: "Character not found", schema: ErrorResponseSchema },
			502: { description: "D&D API unavailable", schema: ErrorResponseSchema },
		},
		summary: "Apply character spell slot defaults",
		tags: ["characters"],
		client: {
			functionName: "applyCharacterSpellSlotDefaults",
			imports: [...characterTypeImports, ...characterSchemaImports],
			pathParamsType: "{ characterId: string }",
			responseParser: "CharacterSpellSlotsResponseSchema",
			responseType: "CharacterSpellSlotsResponse",
		},
	},
	...characterSpellRouteContracts,
] as const satisfies readonly ApiRouteContract[];
