import { describe, expect, it } from "vitest";
import {
	CharacterPathParamsSchema,
	CharacterSpellPathParamsSchema,
	characterSchemaImports,
	characterTypeImports,
	ErrorResponseSchema,
} from "./contract-support.js";

describe("contract support", () => {
	it("parses shared path and error response schemas", () => {
		expect(
			CharacterPathParamsSchema.parse({
				characterId: "00000000-0000-4000-8000-000000000002",
			}),
		).toEqual({ characterId: "00000000-0000-4000-8000-000000000002" });
		expect(
			CharacterSpellPathParamsSchema.parse({
				characterId: "00000000-0000-4000-8000-000000000002",
				spellId: "00000000-0000-4000-8000-000000000030",
			}),
		).toEqual({
			characterId: "00000000-0000-4000-8000-000000000002",
			spellId: "00000000-0000-4000-8000-000000000030",
		});
		expect(ErrorResponseSchema.parse({ error: "Nope." })).toEqual({ error: "Nope." });
	});

	it("includes saved spell types and schemas for generated clients", () => {
		expect(characterTypeImports[0].names).toContain("CharacterSpellDetailsResponse");
		expect(characterTypeImports[0].names).toContain("CharacterSpellsResponse");
		expect(characterTypeImports[0].names).toContain("SearchCharacterSpellsResponse");
		expect(characterSchemaImports[0].names).toContain("CharacterSpellDetailsResponseSchema");
		expect(characterSchemaImports[0].names).toContain("CharacterSpellsResponseSchema");
		expect(characterSchemaImports[0].names).toContain("SearchCharacterSpellsResponseSchema");
	});
});
