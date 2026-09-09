import { describe, expect, it } from "vitest";
import {
	CharacterSpellSlotsResponseSchema,
	UpdateCharacterExperienceRequestSchema,
	UpdateCharacterLevelRequestSchema,
	UpdateCharacterNameRequestSchema,
	UpdateCharacterSpellSlotsRequestSchema,
	UseCharacterSpellSlotRequestSchema,
} from "./character.js";

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

describe("UpdateCharacterExperienceRequestSchema", () => {
	it("accepts editable experience points", () => {
		expect(UpdateCharacterExperienceRequestSchema.parse({ experiencePoints: 27_000 })).toEqual({
			experiencePoints: 27_000,
		});
	});

	it("rejects negative or fractional experience points", () => {
		expect(() => UpdateCharacterExperienceRequestSchema.parse({ experiencePoints: -1 })).toThrow();
		expect(() =>
			UpdateCharacterExperienceRequestSchema.parse({ experiencePoints: 12.5 }),
		).toThrow();
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
