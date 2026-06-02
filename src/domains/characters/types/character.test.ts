import { describe, expect, it } from "vitest";
import {
	CHARACTER_CLASSES,
	CharacterNameSchema,
	CharacterResponseSchema,
	CreateCharacterSchema,
} from "./character.js";

describe("CHARACTER_CLASSES", () => {
	it("contains the core D&D 5e class names used by the create dropdown", () => {
		expect(CHARACTER_CLASSES).toEqual([
			"Barbarian",
			"Bard",
			"Cleric",
			"Druid",
			"Fighter",
			"Monk",
			"Paladin",
			"Ranger",
			"Rogue",
			"Sorcerer",
			"Warlock",
			"Wizard",
		]);
	});
});

describe("CreateCharacterSchema", () => {
	it("trims names and accepts a valid character payload", () => {
		expect(
			CreateCharacterSchema.parse({
				name: "  Tamsin  ",
				class: "Wizard",
				level: 3,
			}),
		).toEqual({
			name: "Tamsin",
			class: "Wizard",
			level: 3,
		});
	});

	it("rejects missing names, unsupported classes, and levels outside 1 through 20", () => {
		expect(() =>
			CreateCharacterSchema.parse({
				name: " ",
				class: "Commoner",
				level: 21,
			}),
		).toThrow();
	});
});

describe("CharacterNameSchema", () => {
	it("allows names up to 120 trimmed characters", () => {
		expect(CharacterNameSchema.parse("x".repeat(120))).toHaveLength(120);
		expect(() => CharacterNameSchema.parse("x".repeat(121))).toThrow();
	});
});

describe("CharacterResponseSchema", () => {
	it("describes JSON-safe character responses", () => {
		expect(
			CharacterResponseSchema.parse({
				id: "00000000-0000-4000-8000-000000000000",
				name: "Brann",
				class: "Fighter",
				level: 1,
				createdAt: "2026-05-31T12:00:00.000Z",
				updatedAt: "2026-05-31T12:00:00.000Z",
			}),
		).toMatchObject({ name: "Brann", class: "Fighter", level: 1 });
	});
});
