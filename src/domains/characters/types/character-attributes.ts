import { z } from "zod";

export const ABILITY_KEYS = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];
export const AbilityKeySchema = z.enum(ABILITY_KEYS);

export type CharacterAbilityConfig = { key: AbilityKey; label: string };
export const CHARACTER_ABILITIES = [
	{ key: "strength", label: "Strength" },
	{ key: "dexterity", label: "Dexterity" },
	{ key: "constitution", label: "Constitution" },
	{ key: "intelligence", label: "Intelligence" },
	{ key: "wisdom", label: "Wisdom" },
	{ key: "charisma", label: "Charisma" },
] as const satisfies readonly CharacterAbilityConfig[];

export const SKILL_KEYS = [
	"athletics",
	"acrobatics",
	"sleight-of-hand",
	"stealth",
	"arcana",
	"history",
	"investigation",
	"nature",
	"religion",
	"animal-handling",
	"insight",
	"medicine",
	"perception",
	"survival",
	"deception",
	"intimidation",
	"performance",
	"persuasion",
] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];
export const SkillKeySchema = z.enum(SKILL_KEYS);

export type CharacterSkillConfig = { key: SkillKey; label: string; ability: AbilityKey };
export const CHARACTER_SKILLS = [
	{ key: "athletics", label: "Athletics", ability: "strength" },
	{ key: "acrobatics", label: "Acrobatics", ability: "dexterity" },
	{ key: "sleight-of-hand", label: "Sleight of Hand", ability: "dexterity" },
	{ key: "stealth", label: "Stealth", ability: "dexterity" },
	{ key: "arcana", label: "Arcana", ability: "intelligence" },
	{ key: "history", label: "History", ability: "intelligence" },
	{ key: "investigation", label: "Investigation", ability: "intelligence" },
	{ key: "nature", label: "Nature", ability: "intelligence" },
	{ key: "religion", label: "Religion", ability: "intelligence" },
	{ key: "animal-handling", label: "Animal Handling", ability: "wisdom" },
	{ key: "insight", label: "Insight", ability: "wisdom" },
	{ key: "medicine", label: "Medicine", ability: "wisdom" },
	{ key: "perception", label: "Perception", ability: "wisdom" },
	{ key: "survival", label: "Survival", ability: "wisdom" },
	{ key: "deception", label: "Deception", ability: "charisma" },
	{ key: "intimidation", label: "Intimidation", ability: "charisma" },
	{ key: "performance", label: "Performance", ability: "charisma" },
	{ key: "persuasion", label: "Persuasion", ability: "charisma" },
] as const satisfies readonly CharacterSkillConfig[];

export const SKILL_TO_ABILITY: Readonly<Record<SkillKey, AbilityKey>> = Object.fromEntries(
	CHARACTER_SKILLS.map((skill) => [skill.key, skill.ability]),
) as Record<SkillKey, AbilityKey>;
export const SAVING_THROW_KEYS = ABILITY_KEYS;
export type SavingThrowKey = AbilityKey;
export const SavingThrowKeySchema = AbilityKeySchema;

export const ProficiencyRankSchema = z.enum(["none", "half", "proficient", "expertise"]);
export type ProficiencyRank = z.infer<typeof ProficiencyRankSchema>;
export const PersistedProficiencyRankSchema = z.enum(["half", "proficient", "expertise"]);
export type PersistedProficiencyRank = z.infer<typeof PersistedProficiencyRankSchema>;

export const AbilityScoreSchema = z.number().int().min(1).max(30);
export type AbilityScore = z.infer<typeof AbilityScoreSchema>;
export const AbilityModifierSchema = z.number().int().min(-5).max(10);
export type AbilityModifier = z.infer<typeof AbilityModifierSchema>;

export const CharacterAbilityScoresSchema = z
	.object({
		strength: AbilityScoreSchema,
		dexterity: AbilityScoreSchema,
		constitution: AbilityScoreSchema,
		intelligence: AbilityScoreSchema,
		wisdom: AbilityScoreSchema,
		charisma: AbilityScoreSchema,
	})
	.strict();
export type CharacterAbilityScores = z.infer<typeof CharacterAbilityScoresSchema>;
export const CharacterScoresSchema = CharacterAbilityScoresSchema;
export type CharacterScores = CharacterAbilityScores;

export const CharacterAbilityModifiersSchema = z
	.object({
		strength: AbilityModifierSchema,
		dexterity: AbilityModifierSchema,
		constitution: AbilityModifierSchema,
		intelligence: AbilityModifierSchema,
		wisdom: AbilityModifierSchema,
		charisma: AbilityModifierSchema,
	})
	.strict();
export type CharacterAbilityModifiers = z.infer<typeof CharacterAbilityModifiersSchema>;

export const CharacterSavingThrowProficiencySchema = z
	.object({ key: SavingThrowKeySchema, rank: z.enum(["none", "proficient"]) })
	.strict();
export type CharacterSavingThrowProficiency = z.infer<typeof CharacterSavingThrowProficiencySchema>;
export const PersistedSavingThrowProficiencySchema = z
	.object({ key: SavingThrowKeySchema, rank: z.literal("proficient") })
	.strict();
export type PersistedSavingThrowProficiency = z.infer<typeof PersistedSavingThrowProficiencySchema>;
export const PersistedCharacterSavingThrowProficiencySchema = PersistedSavingThrowProficiencySchema;
export type PersistedCharacterSavingThrowProficiency = PersistedSavingThrowProficiency;

export const CharacterSkillProficiencySchema = z
	.object({ key: SkillKeySchema, rank: ProficiencyRankSchema })
	.strict();
export type CharacterSkillProficiency = z.infer<typeof CharacterSkillProficiencySchema>;
export const PersistedCharacterSkillProficiencySchema = z
	.object({ key: SkillKeySchema, rank: PersistedProficiencyRankSchema })
	.strict();
export type PersistedCharacterSkillProficiency = z.infer<
	typeof PersistedCharacterSkillProficiencySchema
>;

export const CompleteCharacterSavingThrowProficienciesSchema = z
	.array(CharacterSavingThrowProficiencySchema)
	.length(SAVING_THROW_KEYS.length)
	.refine((values) => hasExactKeys(values, SAVING_THROW_KEYS), {
		message: "Saving throw selections must include exactly one rank for every ability.",
	});
export type CompleteCharacterSavingThrowProficiencies = z.infer<
	typeof CompleteCharacterSavingThrowProficienciesSchema
>;
export const CompleteSavingThrowProficienciesSchema =
	CompleteCharacterSavingThrowProficienciesSchema;

export const CompleteCharacterSkillProficienciesSchema = z
	.array(CharacterSkillProficiencySchema)
	.length(SKILL_KEYS.length)
	.refine((values) => hasExactKeys(values, SKILL_KEYS), {
		message: "Skill selections must include exactly one rank for every skill.",
	});
export type CompleteCharacterSkillProficiencies = z.infer<
	typeof CompleteCharacterSkillProficienciesSchema
>;
export const CompleteSkillProficienciesSchema = CompleteCharacterSkillProficienciesSchema;

export const PersistedCharacterSavingThrowProficienciesSchema = z
	.array(PersistedSavingThrowProficiencySchema)
	.max(SAVING_THROW_KEYS.length)
	.refine((values) => hasUniqueKeys(values), {
		message: "Persisted saving throw selections must be unique.",
	});
export type PersistedCharacterSavingThrowProficiencies = z.infer<
	typeof PersistedCharacterSavingThrowProficienciesSchema
>;
export const SparseSavingThrowProficienciesSchema =
	PersistedCharacterSavingThrowProficienciesSchema;

export const PersistedCharacterSkillProficienciesSchema = z
	.array(PersistedCharacterSkillProficiencySchema)
	.max(SKILL_KEYS.length)
	.refine((values) => hasUniqueKeys(values), {
		message: "Persisted skill selections must be unique.",
	});
export type PersistedCharacterSkillProficiencies = z.infer<
	typeof PersistedCharacterSkillProficienciesSchema
>;
export const SparseCharacterSkillProficienciesSchema = PersistedCharacterSkillProficienciesSchema;

export const CharacterProficienciesSchema = z
	.object({
		savingThrowProficiencies: CompleteCharacterSavingThrowProficienciesSchema,
		skillProficiencies: CompleteCharacterSkillProficienciesSchema,
	})
	.strict();
export type CharacterProficiencies = z.infer<typeof CharacterProficienciesSchema>;
export const CharacterSkillProficienciesSchema = CompleteCharacterSkillProficienciesSchema;
export type CharacterSkillProficiencies = CompleteCharacterSkillProficiencies;

export const PersistedCharacterProficienciesSchema = z
	.object({
		savingThrowProficiencies: PersistedCharacterSavingThrowProficienciesSchema,
		skillProficiencies: PersistedCharacterSkillProficienciesSchema,
	})
	.strict();
export type PersistedCharacterProficiencies = z.infer<typeof PersistedCharacterProficienciesSchema>;

export const CharacterAttributesUpdateRequestSchema = z
	.object({
		scores: CharacterAbilityScoresSchema,
		savingThrowProficiencies: CompleteCharacterSavingThrowProficienciesSchema,
		skillProficiencies: CompleteCharacterSkillProficienciesSchema,
	})
	.strict();
export type CharacterAttributesUpdateRequest = z.infer<
	typeof CharacterAttributesUpdateRequestSchema
>;
export const UpdateCharacterAttributesRequestSchema = CharacterAttributesUpdateRequestSchema;
export type UpdateCharacterAttributesRequest = CharacterAttributesUpdateRequest;

export const ProficiencyBonusSchema = z.number().int().min(0).max(20);
export type ProficiencyBonus = z.infer<typeof ProficiencyBonusSchema>;

export function calculateAbilityModifier(score: number): number {
	const parsedScore = AbilityScoreSchema.parse(score);
	return Math.floor((parsedScore - 10) / 2);
}

export function calculateProficiencyContribution(
	rank: ProficiencyRank,
	proficiencyBonus: number,
): number {
	const parsedRank = ProficiencyRankSchema.parse(rank);
	const parsedBonus = ProficiencyBonusSchema.parse(proficiencyBonus);
	if (parsedRank === "half") return Math.floor(parsedBonus / 2);
	if (parsedRank === "proficient") return parsedBonus;
	if (parsedRank === "expertise") return parsedBonus * 2;
	return 0;
}

export function formatSignedModifier(value: number): string {
	if (!Number.isInteger(value)) throw new Error("A signed modifier must be an integer.");
	return value >= 0 ? `+${value}` : `${value}`;
}

function hasUniqueKeys(values: readonly { key: string }[]) {
	return new Set(values.map((value) => value.key)).size === values.length;
}

function hasExactKeys(values: readonly { key: string }[], expected: readonly string[]) {
	return (
		values.length === expected.length &&
		hasUniqueKeys(values) &&
		expected.every((key) => values.some((value) => value.key === key))
	);
}
