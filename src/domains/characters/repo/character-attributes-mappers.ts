import { z } from "zod";
import {
	ABILITY_KEYS,
	type CharacterAbilityScores,
	CharacterAbilityScoresSchema,
	CharacterIdSchema,
	type CompleteCharacterSavingThrowProficiencies,
	CompleteCharacterSavingThrowProficienciesSchema,
	type CompleteCharacterSkillProficiencies,
	CompleteCharacterSkillProficienciesSchema,
	PersistedCharacterProficienciesSchema,
	PersistedCharacterSavingThrowProficiencySchema,
	PersistedCharacterSkillProficiencySchema,
	PersistedProficiencyRankSchema,
	SAVING_THROW_KEYS,
	SKILL_KEYS,
	SkillKeySchema,
} from "../types/index.js";

const DatabaseDateSchema = z.union([z.date(), z.iso.datetime()]);

export const CharacterAttributesDatabaseRowSchema = z
	.object({
		characterId: CharacterIdSchema,
		strength: z.number().int(),
		dexterity: z.number().int(),
		constitution: z.number().int(),
		intelligence: z.number().int(),
		wisdom: z.number().int(),
		charisma: z.number().int(),
		createdAt: DatabaseDateSchema,
		updatedAt: DatabaseDateSchema,
	})
	.strict();

const CharacterSkillDatabaseRowSchema = z
	.object({
		characterId: CharacterIdSchema,
		category: z.literal("skill"),
		key: SkillKeySchema,
		rank: PersistedProficiencyRankSchema,
		createdAt: DatabaseDateSchema,
		updatedAt: DatabaseDateSchema,
	})
	.strict();

const CharacterSavingThrowDatabaseRowSchema = z
	.object({
		characterId: CharacterIdSchema,
		category: z.literal("saving-throw"),
		key: z.enum(ABILITY_KEYS),
		rank: z.literal("proficient"),
		createdAt: DatabaseDateSchema,
		updatedAt: DatabaseDateSchema,
	})
	.strict();

export const CharacterProficiencyDatabaseRowSchema = z.discriminatedUnion("category", [
	CharacterSkillDatabaseRowSchema,
	CharacterSavingThrowDatabaseRowSchema,
]);

export type CharacterAttributesPersistenceState = {
	scores: CharacterAbilityScores;
	savingThrowProficiencies: CompleteCharacterSavingThrowProficiencies;
	skillProficiencies: CompleteCharacterSkillProficiencies;
};

export function toCharacterAttributesDatabaseRow(row: unknown) {
	return CharacterAttributesDatabaseRowSchema.parse(row);
}

export function toCharacterProficiencyDatabaseRow(row: unknown) {
	return CharacterProficiencyDatabaseRowSchema.parse(row);
}

export function toCharacterAttributesPersistenceState(
	attributesRow: unknown,
	proficiencyRows: readonly unknown[],
): CharacterAttributesPersistenceState {
	const attributes = toCharacterAttributesDatabaseRow(attributesRow);
	const proficiencies = proficiencyRows.map(toCharacterProficiencyDatabaseRow);
	if (proficiencies.some((row) => row.characterId !== attributes.characterId)) {
		throw new Error("Character proficiency rows do not belong to the attribute row.");
	}
	const persistedSavingThrows = proficiencies
		.filter((row) => row.category === "saving-throw")
		.map(({ key, rank }) => PersistedCharacterSavingThrowProficiencySchema.parse({ key, rank }));
	const persistedSkills = proficiencies
		.filter((row) => row.category === "skill")
		.map(({ key, rank }) => PersistedCharacterSkillProficiencySchema.parse({ key, rank }));
	const persisted = PersistedCharacterProficienciesSchema.parse({
		savingThrowProficiencies: persistedSavingThrows,
		skillProficiencies: persistedSkills,
	});

	const savingThrowByKey = new Map(
		persisted.savingThrowProficiencies.map((entry) => [entry.key, entry.rank]),
	);
	const skillByKey = new Map(persisted.skillProficiencies.map((entry) => [entry.key, entry.rank]));

	return {
		scores: CharacterAbilityScoresSchema.parse({
			strength: attributes.strength,
			dexterity: attributes.dexterity,
			constitution: attributes.constitution,
			intelligence: attributes.intelligence,
			wisdom: attributes.wisdom,
			charisma: attributes.charisma,
		}),
		savingThrowProficiencies: CompleteCharacterSavingThrowProficienciesSchema.parse(
			SAVING_THROW_KEYS.map((key) => ({ key, rank: savingThrowByKey.get(key) ?? "none" })),
		),
		skillProficiencies: CompleteCharacterSkillProficienciesSchema.parse(
			SKILL_KEYS.map((key) => ({ key, rank: skillByKey.get(key) ?? "none" })),
		),
	};
}
