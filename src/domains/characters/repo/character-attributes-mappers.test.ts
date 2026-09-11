import { describe, expect, it } from "vitest";
import {
	CharacterProficiencyDatabaseRowSchema,
	toCharacterAttributesDatabaseRow,
	toCharacterAttributesPersistenceState,
	toCharacterProficiencyDatabaseRow,
} from "./character-attributes-mappers.js";

const characterId = "00000000-0000-4000-8000-000000000001";
const timestamps = {
	createdAt: new Date("2026-09-01T12:00:00.000Z"),
	updatedAt: new Date("2026-09-01T12:00:00.000Z"),
};
const attributes = {
	characterId,
	strength: 16,
	dexterity: 14,
	constitution: 12,
	intelligence: 10,
	wisdom: 8,
	charisma: 18,
	...timestamps,
};

describe("character attribute database mappers", () => {
	it("parses strict score rows", () => {
		expect(toCharacterAttributesDatabaseRow(attributes)).toEqual(attributes);
		expect(() => toCharacterAttributesDatabaseRow({ ...attributes, strength: 10.5 })).toThrow();
		expect(() => toCharacterAttributesDatabaseRow({ ...attributes, unexpected: true })).toThrow();
	});

	it("parses category-specific proficiency rows strictly", () => {
		const skill = {
			...timestamps,
			characterId,
			category: "skill",
			key: "stealth",
			rank: "expertise",
		};
		const save = {
			...timestamps,
			characterId,
			category: "saving-throw",
			key: "wisdom",
			rank: "proficient",
		};
		expect(toCharacterProficiencyDatabaseRow(skill)).toEqual(skill);
		expect(toCharacterProficiencyDatabaseRow(save)).toEqual(save);
		expect(() => CharacterProficiencyDatabaseRowSchema.parse({ ...skill, rank: "none" })).toThrow();
		expect(() =>
			CharacterProficiencyDatabaseRowSchema.parse({ ...save, key: "stealth" }),
		).toThrow();
	});

	it("materializes omitted none ranks without accepting malformed rows", () => {
		const state = toCharacterAttributesPersistenceState(attributes, [
			{ ...timestamps, characterId, category: "skill", key: "stealth", rank: "expertise" },
			{ ...timestamps, characterId, category: "saving-throw", key: "wisdom", rank: "proficient" },
		]);
		expect(state.scores).toEqual({
			strength: 16,
			dexterity: 14,
			constitution: 12,
			intelligence: 10,
			wisdom: 8,
			charisma: 18,
		});
		expect(state.skillProficiencies.find((entry) => entry.key === "stealth")?.rank).toBe(
			"expertise",
		);
		expect(state.skillProficiencies.filter((entry) => entry.rank === "none")).toHaveLength(17);
		expect(state.savingThrowProficiencies.find((entry) => entry.key === "wisdom")?.rank).toBe(
			"proficient",
		);
		expect(() =>
			toCharacterAttributesPersistenceState(attributes, [
				{ ...timestamps, characterId, category: "skill", key: "stealth", rank: "none" },
			]),
		).toThrow();
		expect(() =>
			toCharacterAttributesPersistenceState(attributes, [
				{ ...timestamps, characterId, category: "skill", key: "stealth", rank: "expertise" },
				{ ...timestamps, characterId, category: "skill", key: "stealth", rank: "proficient" },
			]),
		).toThrow();
		expect(() =>
			toCharacterAttributesPersistenceState(attributes, [
				{
					...timestamps,
					characterId: "00000000-0000-4000-8000-000000000002",
					category: "skill",
					key: "stealth",
					rank: "expertise",
				},
			]),
		).toThrow();
	});
});
