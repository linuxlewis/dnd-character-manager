import { describe, expect, it } from "vitest";
import {
	CharacterAttributesResponseSchema,
	calculateRollTotal,
	RollReferenceEntrySchema,
} from "./character-rolls.js";

describe("character roll schemas", () => {
	it("accepts ordered components that sum to a roll total", () => {
		const entry = {
			id: "saving-throw-wisdom",
			label: "Wisdom save",
			category: "saving-throw",
			ability: "wisdom",
			proficiencyRank: "proficient",
			total: 5,
			components: [
				{ type: "ability", label: "Wisdom", value: 2 },
				{ type: "proficiency", label: "Proficient", value: 3 },
			],
		} as const;

		expect(RollReferenceEntrySchema.parse(entry)).toEqual(entry);
		expect(calculateRollTotal(entry.components)).toBe(5);
		expect(() => RollReferenceEntrySchema.parse({ ...entry, total: 4 })).toThrow();
		expect(() =>
			RollReferenceEntrySchema.parse({
				...entry,
				components: [...entry.components, { type: "base", label: "Extra", value: 1 }],
			}),
		).toThrow();
		expect(() => RollReferenceEntrySchema.parse({ ...entry, unexpected: true })).toThrow();
	});

	it("rejects malformed response entries and unexpected fields", () => {
		const response = {
			attributes: {
				scores: {
					strength: 10,
					dexterity: 10,
					constitution: 10,
					intelligence: 10,
					wisdom: 10,
					charisma: 10,
				},
				modifiers: {
					strength: 0,
					dexterity: 0,
					constitution: 0,
					intelligence: 0,
					wisdom: 0,
					charisma: 0,
				},
				proficiencyBonus: 2,
				savingThrowProficiencies: [],
				skillProficiencies: [],
				rollReference: [],
			},
		};
		expect(CharacterAttributesResponseSchema.safeParse(response).success).toBe(false);
	});
});
