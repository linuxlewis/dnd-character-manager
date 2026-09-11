import type { z } from "zod";
import {
	CHARACTER_ABILITIES,
	CHARACTER_SKILLS,
	type ProficiencyRank,
} from "./character-attributes.js";
import type { RollBreakdownComponentType, RollReferenceEntry } from "./character-rolls.js";

export function validateRollReference(
	entries: readonly RollReferenceEntry[],
	context: z.RefinementCtx,
) {
	const expected = [
		...CHARACTER_ABILITIES.map((ability) => ({
			id: `ability-check-${ability.key}`,
			category: "ability-check" as const,
			ability: ability.key,
			label: `${ability.label} check`,
			abilityLabel: ability.label,
			shape: "ability" as const,
		})),
		...CHARACTER_SKILLS.map((skill) => ({
			id: `skill-${skill.key}`,
			category: "skill" as const,
			ability: skill.ability,
			label: skill.label,
			abilityLabel: getAbilityLabel(skill.ability),
			shape: "skill" as const,
		})),
		...CHARACTER_ABILITIES.map((ability) => ({
			id: `saving-throw-${ability.key}`,
			category: "saving-throw" as const,
			ability: ability.key,
			label: `${ability.label} save`,
			abilityLabel: ability.label,
			shape: "saving-throw" as const,
		})),
		{
			id: "initiative",
			category: "initiative" as const,
			ability: "dexterity" as const,
			label: "Initiative",
			abilityLabel: "Dexterity",
			shape: "initiative" as const,
		},
		{
			id: "passive-perception",
			category: "passive" as const,
			ability: "wisdom" as const,
			label: "Passive Perception",
			abilityLabel: "Wisdom",
			shape: "passive" as const,
		},
	];

	entries.forEach((entry, index) => {
		const expectedEntry = expected[index];
		if (!expectedEntry) {
			addIssue(context, index, "Roll reference contains an unexpected entry.");
			return;
		}
		if (
			entry.id !== expectedEntry.id ||
			entry.category !== expectedEntry.category ||
			entry.ability !== expectedEntry.ability ||
			entry.label !== expectedEntry.label
		) {
			addIssue(context, index, "Entry ID, label, category, or order is invalid.");
		}
		if (expectedEntry.shape === "ability" || expectedEntry.shape === "initiative") {
			if (
				entry.proficiencyRank !== null ||
				!hasComponents(entry, [{ type: "ability", label: expectedEntry.abilityLabel }])
			) {
				addIssue(
					context,
					index,
					"Ability checks and initiative require a null rank and one ability component.",
				);
			}
		}
		if (expectedEntry.shape === "skill") {
			if (
				entry.proficiencyRank === null ||
				!hasComponents(entry, [
					{ type: "ability", label: expectedEntry.abilityLabel },
					{ type: "proficiency", label: getRankLabel(entry.proficiencyRank) },
				])
			) {
				addIssue(context, index, "Skills require a rank and ability plus proficiency components.");
			}
		}
		if (expectedEntry.shape === "saving-throw") {
			if (
				!isSavingThrowRank(entry.proficiencyRank) ||
				!hasComponents(entry, [
					{ type: "ability", label: expectedEntry.abilityLabel },
					{ type: "proficiency", label: getRankLabel(entry.proficiencyRank ?? "none") },
				])
			) {
				addIssue(
					context,
					index,
					"Saving throws require none or proficient and ability plus proficiency components.",
				);
			}
		}
		if (expectedEntry.shape === "passive") {
			const perceptionRank = entries.find(
				(candidate) => candidate.id === "skill-perception",
			)?.proficiencyRank;
			if (
				entry.proficiencyRank !== perceptionRank ||
				!hasComponents(entry, [
					{ type: "base", label: "Base" },
					{ type: "ability", label: expectedEntry.abilityLabel },
					{ type: "proficiency", label: getRankLabel(entry.proficiencyRank ?? "none") },
				])
			) {
				addIssue(
					context,
					index,
					"Passive Perception must mirror Perception and use base, ability, and proficiency components.",
				);
			}
		}
	});
}

function hasComponents(
	entry: RollReferenceEntry,
	components: readonly { type: RollBreakdownComponentType; label: string }[],
) {
	return (
		entry.components.length === components.length &&
		entry.components.every(
			(component, index) =>
				component.type === components[index].type && component.label === components[index].label,
		)
	);
}

function getAbilityLabel(ability: (typeof CHARACTER_ABILITIES)[number]["key"]) {
	return CHARACTER_ABILITIES.find((entry) => entry.key === ability)?.label ?? ability;
}

function getRankLabel(rank: ProficiencyRank) {
	return rank === "none" ? "No proficiency" : rank[0].toUpperCase() + rank.slice(1);
}

function isSavingThrowRank(rank: ProficiencyRank | null): rank is "none" | "proficient" {
	return rank === "none" || rank === "proficient";
}

function addIssue(context: z.RefinementCtx, index: number, message: string) {
	context.addIssue({ code: "custom", path: [index], message });
}
