import { describe, expect, it } from "vitest";
import {
	CharacterDetailResponseSchema,
	CreateCharacterRequestSchema,
	UpdateCharacterHealthRequestSchema,
} from "./character.js";

describe("CreateCharacterRequestSchema", () => {
	it("accepts the character creation MVP fields plus initial max HP", () => {
		expect(
			CreateCharacterRequestSchema.parse({
				name: "Mira",
				className: "Fighter",
				level: 3,
				maxHp: 28,
			}),
		).toEqual({
			name: "Mira",
			className: "Fighter",
			level: 3,
			maxHp: 28,
		});
	});

	it("rejects empty names and invalid levels", () => {
		expect(() =>
			CreateCharacterRequestSchema.parse({
				name: " ",
				className: "Wizard",
				level: 21,
				maxHp: 12,
			}),
		).toThrow();
	});
});

describe("UpdateCharacterHealthRequestSchema", () => {
	it("allows editable current, max, and temporary HP values", () => {
		expect(
			UpdateCharacterHealthRequestSchema.parse({
				currentHp: 18,
				maxHp: 20,
				temporaryHp: 5,
			}),
		).toEqual({
			currentHp: 18,
			maxHp: 20,
			temporaryHp: 5,
		});
	});

	it("rejects negative HP and zero max HP", () => {
		expect(() =>
			UpdateCharacterHealthRequestSchema.parse({
				currentHp: -1,
				maxHp: 0,
				temporaryHp: 0,
			}),
		).toThrow();
	});
});

describe("CharacterDetailResponseSchema", () => {
	it("describes the detail payload used by the character detail page", () => {
		const response = {
			character: {
				id: "00000000-0000-4000-8000-000000000001",
				name: "Mira",
				className: "Fighter",
				level: 3,
				health: {
					currentHp: 28,
					maxHp: 28,
					temporaryHp: 0,
					effectiveMaxHp: 28,
				},
				recentHealthChanges: [],
			},
		};

		expect(CharacterDetailResponseSchema.parse(response)).toEqual(response);
	});
});
