import { describe, expect, it } from "vitest";
import {
	AbilityScoresSchema,
	CharacterSchema,
	CreateCharacterSchema,
	UpdateCharacterSchema,
	getAbilityModifier,
} from "./character.js";

const validAbilityScores = {
	STR: 10,
	DEX: 14,
	CON: 12,
	INT: 8,
	WIS: 15,
	CHA: 13,
};

const validCharacter = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	name: "Gandalf",
	race: "Human",
	class: "Wizard",
	level: 5,
	abilityScores: validAbilityScores,
	createdAt: "2025-01-01T00:00:00Z",
	updatedAt: "2025-01-01T00:00:00Z",
};

describe("AbilityScoresSchema", () => {
	it("parses valid ability scores", () => {
		const result = AbilityScoresSchema.safeParse(validAbilityScores);
		expect(result.success).toBe(true);
	});

	it("rejects score below 1", () => {
		const result = AbilityScoresSchema.safeParse({ ...validAbilityScores, STR: 0 });
		expect(result.success).toBe(false);
	});

	it("rejects score above 30", () => {
		const result = AbilityScoresSchema.safeParse({ ...validAbilityScores, DEX: 31 });
		expect(result.success).toBe(false);
	});

	it("rejects non-integer scores", () => {
		const result = AbilityScoresSchema.safeParse({ ...validAbilityScores, CON: 10.5 });
		expect(result.success).toBe(false);
	});
});

describe("getAbilityModifier", () => {
	it("returns 0 for score 10", () => {
		expect(getAbilityModifier(10)).toBe(0);
	});

	it("returns 0 for score 11", () => {
		expect(getAbilityModifier(11)).toBe(0);
	});

	it("returns 2 for score 14", () => {
		expect(getAbilityModifier(14)).toBe(2);
	});

	it("returns -1 for score 8", () => {
		expect(getAbilityModifier(8)).toBe(-1);
	});

	it("returns 5 for score 20", () => {
		expect(getAbilityModifier(20)).toBe(5);
	});

	it("returns -5 for score 1", () => {
		expect(getAbilityModifier(1)).toBe(-5);
	});
});

describe("CharacterSchema", () => {
	it("parses a valid character", () => {
		const result = CharacterSchema.safeParse(validCharacter);
		expect(result.success).toBe(true);
	});

	it("rejects empty name", () => {
		const result = CharacterSchema.safeParse({ ...validCharacter, name: "" });
		expect(result.success).toBe(false);
	});

	it("rejects level above 20", () => {
		const result = CharacterSchema.safeParse({ ...validCharacter, level: 21 });
		expect(result.success).toBe(false);
	});

	it("rejects level below 1", () => {
		const result = CharacterSchema.safeParse({ ...validCharacter, level: 0 });
		expect(result.success).toBe(false);
	});
});

describe("CreateCharacterSchema", () => {
	it("does not require id or timestamps", () => {
		const result = CreateCharacterSchema.safeParse({
			name: "Aragorn",
			race: "Human",
			class: "Ranger",
			level: 10,
			abilityScores: validAbilityScores,
		});
		expect(result.success).toBe(true);
	});
});

describe("UpdateCharacterSchema", () => {
	it("allows partial updates", () => {
		const result = UpdateCharacterSchema.safeParse({ name: "New Name" });
		expect(result.success).toBe(true);
	});

	it("allows empty object", () => {
		const result = UpdateCharacterSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});
