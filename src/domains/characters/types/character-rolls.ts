import { z } from "zod";
import { CharacterLevelSchema } from "./character.js";
import {
	ABILITY_KEYS,
	type AbilityKey,
	type CharacterAbilityConfig,
	CharacterAbilityModifiersSchema,
	CharacterAbilityScoresSchema,
	type CharacterSkillConfig,
	CompleteCharacterSavingThrowProficienciesSchema,
	CompleteCharacterSkillProficienciesSchema,
	calculateAbilityModifier,
	calculateProficiencyContribution,
	PersistedCharacterProficienciesSchema,
	ProficiencyBonusSchema,
	type ProficiencyRank,
	ProficiencyRankSchema,
	SKILL_TO_ABILITY,
} from "./character-attributes.js";
import { validateRollReference } from "./character-roll-validation.js";

export const RollCategorySchema = z.enum([
	"ability-check",
	"skill",
	"saving-throw",
	"initiative",
	"passive",
]);
export type RollCategory = z.infer<typeof RollCategorySchema>;

export const RollBreakdownComponentTypeSchema = z.enum(["base", "ability", "proficiency"]);
export type RollBreakdownComponentType = z.infer<typeof RollBreakdownComponentTypeSchema>;

export const RollBreakdownComponentSchema = z
	.object({
		type: RollBreakdownComponentTypeSchema,
		label: z.string().min(1).max(80),
		value: z.number().int(),
	})
	.strict();
export type RollBreakdownComponent = z.infer<typeof RollBreakdownComponentSchema>;

export const RollReferenceEntrySchema = z
	.object({
		id: z.string().min(1).max(80),
		label: z.string().min(1).max(120),
		category: RollCategorySchema,
		ability: z.enum(ABILITY_KEYS),
		proficiencyRank: ProficiencyRankSchema.nullable(),
		total: z.number().int(),
		components: z.array(RollBreakdownComponentSchema).min(1).max(3),
	})
	.strict()
	.refine(hasComponentsTotal, {
		message: "Roll breakdown components must sum to the roll total.",
		path: ["components"],
	});
export type RollReferenceEntry = z.infer<typeof RollReferenceEntrySchema>;

export const RollReferenceSchema = z
	.array(RollReferenceEntrySchema)
	.length(32)
	.superRefine(validateRollReference);
export type RollReference = z.infer<typeof RollReferenceSchema>;

export const CharacterRollCalculationInputSchema = z
	.object({
		level: CharacterLevelSchema,
		scores: CharacterAbilityScoresSchema,
		...PersistedCharacterProficienciesSchema.shape,
	})
	.strict();
export type CharacterRollCalculationInput = z.infer<typeof CharacterRollCalculationInputSchema>;

export const CharacterAttributesSchema = z
	.object({
		scores: CharacterAbilityScoresSchema,
		modifiers: CharacterAbilityModifiersSchema,
		proficiencyBonus: ProficiencyBonusSchema,
		savingThrowProficiencies: CompleteCharacterSavingThrowProficienciesSchema,
		skillProficiencies: CompleteCharacterSkillProficienciesSchema,
		rollReference: RollReferenceSchema,
	})
	.strict();
export type CharacterAttributes = z.infer<typeof CharacterAttributesSchema>;

export const CharacterAttributesResponseSchema = z
	.object({ attributes: CharacterAttributesSchema })
	.strict();
export type CharacterAttributesResponse = z.infer<typeof CharacterAttributesResponseSchema>;
export const UpdateCharacterAttributesResponseSchema = CharacterAttributesResponseSchema;
export type UpdateCharacterAttributesResponse = CharacterAttributesResponse;

export type RollReferenceConfiguration = {
	readonly abilities: readonly CharacterAbilityConfig[];
	readonly skills: readonly CharacterSkillConfig[];
	readonly getProficiencyBonus: (level: number) => number;
};

export function buildRollReference(
	input: CharacterRollCalculationInput,
	configuration: RollReferenceConfiguration,
): RollReference {
	const parsed = CharacterRollCalculationInputSchema.parse(input);
	const modifiers = getAbilityModifiers(parsed.scores, configuration.abilities);
	const proficiencyBonus = configuration.getProficiencyBonus(parsed.level);
	const skillRanks = new Map(parsed.skillProficiencies.map((entry) => [entry.key, entry.rank]));
	const savingThrows = new Set(parsed.savingThrowProficiencies.map((entry) => entry.key));
	const entries = [
		...configuration.abilities.map((ability) =>
			makeEntry(
				`ability-check-${ability.key}`,
				`${ability.label} check`,
				"ability-check",
				ability.key,
				null,
				[{ type: "ability", label: ability.label, value: modifiers[ability.key] }],
			),
		),
		...configuration.skills.map((skill) => {
			const ability = skill.ability;
			const rank = skillRanks.get(skill.key) ?? "none";
			const proficiency = calculateProficiencyContribution(rank, proficiencyBonus);
			return makeEntry(`skill-${skill.key}`, skill.label, "skill", ability, rank, [
				{
					type: "ability",
					label: getAbilityLabel(ability, configuration.abilities),
					value: modifiers[ability],
				},
				{ type: "proficiency", label: getRankLabel(rank), value: proficiency },
			]);
		}),
		...configuration.abilities.map((ability) => {
			const rank = savingThrows.has(ability.key) ? "proficient" : "none";
			return makeEntry(
				`saving-throw-${ability.key}`,
				`${ability.label} save`,
				"saving-throw",
				ability.key,
				rank,
				[
					{ type: "ability", label: ability.label, value: modifiers[ability.key] },
					{
						type: "proficiency",
						label: getRankLabel(rank),
						value: calculateProficiencyContribution(rank, proficiencyBonus),
					},
				],
			);
		}),
		makeEntry("initiative", "Initiative", "initiative", "dexterity", null, [
			{ type: "ability", label: "Dexterity", value: modifiers.dexterity },
		]),
		makeEntry(
			"passive-perception",
			"Passive Perception",
			"passive",
			SKILL_TO_ABILITY.perception,
			skillRanks.get("perception") ?? "none",
			[
				{ type: "base", label: "Base", value: 10 },
				{ type: "ability", label: "Wisdom", value: modifiers.wisdom },
				{
					type: "proficiency",
					label: getRankLabel(skillRanks.get("perception") ?? "none"),
					value: calculateProficiencyContribution(
						skillRanks.get("perception") ?? "none",
						proficiencyBonus,
					),
				},
			],
		),
	];

	return RollReferenceSchema.parse(entries);
}

export function buildCharacterAttributes(
	input: CharacterRollCalculationInput,
	configuration: RollReferenceConfiguration,
): CharacterAttributes {
	const parsed = CharacterRollCalculationInputSchema.parse(input);
	const modifiers = getAbilityModifiers(parsed.scores, configuration.abilities);
	const skillRanks = new Map(parsed.skillProficiencies.map((entry) => [entry.key, entry.rank]));
	const savingThrows = new Set(parsed.savingThrowProficiencies.map((entry) => entry.key));
	return CharacterAttributesSchema.parse({
		scores: parsed.scores,
		modifiers,
		proficiencyBonus: configuration.getProficiencyBonus(parsed.level),
		savingThrowProficiencies: configuration.abilities.map((ability) => ({
			key: ability.key,
			rank: savingThrows.has(ability.key) ? "proficient" : "none",
		})),
		skillProficiencies: configuration.skills.map((skill) => ({
			key: skill.key,
			rank: skillRanks.get(skill.key) ?? "none",
		})),
		rollReference: buildRollReference(parsed, configuration),
	});
}

export function calculateRollTotal(components: readonly RollBreakdownComponent[]): number {
	return components.reduce((total, component) => total + component.value, 0);
}

function getAbilityModifiers(
	scores: CharacterRollCalculationInput["scores"],
	abilities: readonly CharacterAbilityConfig[],
) {
	return CharacterAbilityModifiersSchema.parse(
		Object.fromEntries(
			abilities.map((ability) => [ability.key, calculateAbilityModifier(scores[ability.key])]),
		),
	);
}

function makeEntry(
	id: string,
	label: string,
	category: RollCategory,
	ability: AbilityKey,
	proficiencyRank: ProficiencyRank | null,
	components: RollBreakdownComponent[],
) {
	return RollReferenceEntrySchema.parse({
		id,
		label,
		category,
		ability,
		proficiencyRank,
		total: calculateRollTotal(components),
		components,
	});
}

function getAbilityLabel(ability: AbilityKey, abilities: readonly CharacterAbilityConfig[]) {
	return abilities.find((entry) => entry.key === ability)?.label ?? ability;
}

function getRankLabel(rank: ProficiencyRank) {
	return rank === "none" ? "No proficiency" : rank[0].toUpperCase() + rank.slice(1);
}

function hasComponentsTotal(entry: {
	components: readonly RollBreakdownComponent[];
	total: number;
}) {
	return calculateRollTotal(entry.components) === entry.total;
}
