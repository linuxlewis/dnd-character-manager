import { describe, expect, it } from "vitest";
import {
	CharacterDetailResponseSchema,
	CharacterSpellSlotsResponseSchema,
	CreateCharacterRequestSchema,
	UpdateCharacterHealthRequestSchema,
	UpdateCharacterLevelRequestSchema,
	UpdateCharacterNameRequestSchema,
	UpdateCharacterSpellSlotsRequestSchema,
	UseCharacterSpellSlotRequestSchema,
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

describe("UpdateCharacterLevelRequestSchema", () => {
	it("accepts a valid character level update", () => {
		expect(UpdateCharacterLevelRequestSchema.parse({ level: 8 })).toEqual({ level: 8 });
	});

	it("rejects levels outside the D&D character range", () => {
		expect(() => UpdateCharacterLevelRequestSchema.parse({ level: 0 })).toThrow();
		expect(() => UpdateCharacterLevelRequestSchema.parse({ level: 21 })).toThrow();
	});
});

describe("UpdateCharacterNameRequestSchema", () => {
	it("accepts a valid character name update", () => {
		expect(UpdateCharacterNameRequestSchema.parse({ name: "Mira Dawn" })).toEqual({
			name: "Mira Dawn",
		});
	});

	it("rejects blank and overlong names", () => {
		expect(() => UpdateCharacterNameRequestSchema.parse({ name: "   " })).toThrow();
		expect(() => UpdateCharacterNameRequestSchema.parse({ name: "x".repeat(121) })).toThrow();
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

describe("Character spell slot schemas", () => {
	it("accepts an editable spell slot configuration for each spell level", () => {
		const request = {
			slots: Array.from({ length: 9 }, (_, index) => ({
				level: index + 1,
				total: index === 0 ? 4 : 0,
			})),
		};

		expect(UpdateCharacterSpellSlotsRequestSchema.parse(request)).toEqual(request);
	});

	it("rejects duplicate spell slot levels", () => {
		expect(() =>
			UpdateCharacterSpellSlotsRequestSchema.parse({
				slots: [
					{ level: 1, total: 2 },
					{ level: 1, total: 3 },
				],
			}),
		).toThrow();
	});

	it("accepts a single spell level usage request", () => {
		expect(UseCharacterSpellSlotRequestSchema.parse({ level: 3 })).toEqual({ level: 3 });
		expect(() => UseCharacterSpellSlotRequestSchema.parse({ level: 10 })).toThrow();
	});

	it("describes the spell slot sheet response with recent history", () => {
		const response = {
			spellSlots: [
				{ level: 1, total: 4, used: 1, remaining: 3 },
				{ level: 2, total: 2, used: 0, remaining: 2 },
			],
			recentSpellSlotChanges: [
				{
					id: "00000000-0000-4000-8000-000000000010",
					action: "used",
					level: 1,
					previous: { total: 4, used: 0, remaining: 4 },
					next: { total: 4, used: 1, remaining: 3 },
					totalDelta: 0,
					usedDelta: 1,
					createdAt: "2026-07-01T12:00:00.000Z",
				},
			],
		};

		expect(CharacterSpellSlotsResponseSchema.parse(response)).toEqual(response);
	});
});
