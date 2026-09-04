import { describe, expect, it } from "vitest";
import { buildRollReference } from "../config/character-rolls.js";
import { type CharacterRollCalculationInput, RollReferenceSchema } from "./character-rolls.js";

const validInput: CharacterRollCalculationInput = {
	level: 5,
	scores: {
		strength: 10,
		dexterity: 16,
		constitution: 10,
		intelligence: 10,
		wisdom: 14,
		charisma: 10,
	},
	savingThrowProficiencies: [{ key: "wisdom", rank: "proficient" as const }],
	skillProficiencies: [
		{ key: "perception", rank: "proficient" as const },
		{ key: "stealth", rank: "expertise" as const },
	],
};

const validReference = buildRollReference(validInput);

function updateEntry(
	index: number,
	update: (entry: (typeof validReference)[number]) => (typeof validReference)[number],
) {
	return validReference.map((entry, candidateIndex) =>
		candidateIndex === index ? update(entry) : entry,
	);
}

describe("RollReferenceSchema", () => {
	it("accepts the complete stable contract and preserves zero/negative component values", () => {
		expect(RollReferenceSchema.parse(validReference)).toEqual(validReference);
		expect(validReference.find((entry) => entry.id === "passive-perception")?.components).toEqual([
			{ type: "base", label: "Base", value: 10 },
			{ type: "ability", label: "Wisdom", value: 2 },
			{ type: "proficiency", label: "Proficient", value: 3 },
		]);
	});

	it.each([
		["31 entries", validReference.slice(0, 31)],
		["33 entries", [...validReference, validReference[0]]],
	] as const)("rejects %s without throwing", (_description, invalid) => {
		expect(() => {
			expect(RollReferenceSchema.safeParse(invalid).success).toBe(false);
		}).not.toThrow();
	});

	it.each([
		["duplicates IDs", updateEntry(1, (entry) => ({ ...entry, id: validReference[0].id }))],
		["changes order", [...validReference].reverse()],
		["changes a category", updateEntry(24, (entry) => ({ ...entry, category: "skill" }))],
		[
			"gives an ability check a rank",
			updateEntry(0, (entry) => ({ ...entry, proficiencyRank: "none" })),
		],
		[
			"gives a saving throw an unsupported rank",
			updateEntry(28, (entry) => ({ ...entry, proficiencyRank: "expertise" })),
		],
		[
			"gives a skill the wrong component shape",
			updateEntry(22, (entry) => ({ ...entry, components: [entry.components[0]] })),
		],
		[
			"gives passive Perception the wrong rank",
			updateEntry(31, (entry) => ({ ...entry, proficiencyRank: "none" })),
		],
		[
			"gives passive Perception the wrong components",
			updateEntry(31, (entry) => ({ ...entry, components: entry.components.slice(0, 2) })),
		],
	] as const)("rejects data that %s", (_reason, invalid) => {
		expect(RollReferenceSchema.safeParse(invalid).success).toBe(false);
	});
});
