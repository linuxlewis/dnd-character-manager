import type { AbilityKey } from "../types/character-attributes.js";
import type {
	CharacterAttributes,
	CharacterAttributesUpdateRequest,
	CharacterSavingThrowProficiency,
	CharacterSkillProficiency,
	RollCategory,
} from "../types/index.js";
import { CharacterAttributesUpdateRequestSchema } from "../types/index.js";

export type AttributeDraft = {
	scores: Record<AbilityKey, number | string>;
	savingThrowProficiencies: CharacterSavingThrowProficiency[];
	skillProficiencies: CharacterSkillProficiency[];
};

export type AttributeFieldErrors = Record<string, string>;

export function attributeDraftFromSaved(attributes: CharacterAttributes): AttributeDraft {
	return {
		scores: { ...attributes.scores },
		savingThrowProficiencies: attributes.savingThrowProficiencies.map((entry) => ({ ...entry })),
		skillProficiencies: attributes.skillProficiencies.map((entry) => ({ ...entry })),
	};
}

export function normalizeAttributeDraft(draft: AttributeDraft) {
	const parsed = CharacterAttributesUpdateRequestSchema.safeParse({
		scores: Object.fromEntries(
			Object.entries(draft.scores).map(([key, value]) => [key, Number(value)]),
		),
		savingThrowProficiencies: draft.savingThrowProficiencies,
		skillProficiencies: draft.skillProficiencies,
	});
	return parsed.success ? parsed.data : null;
}

export function validateAttributeDraft(draft: AttributeDraft): AttributeFieldErrors {
	const errors: AttributeFieldErrors = {};
	for (const [key, value] of Object.entries(draft.scores)) {
		const score = Number(value);
		if (!Number.isInteger(score) || score < 1 || score > 30) {
			errors[`scores.${key}`] = "Score must be a whole number from 1 to 30";
		}
	}
	return errors;
}

export function attributesEqual(
	left: CharacterAttributesUpdateRequest,
	right: CharacterAttributesUpdateRequest,
) {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function rollMatchesSearch(label: string, abilityLabel: string, search: string) {
	const normalizedSearch = search.trim().toLocaleLowerCase();
	if (!normalizedSearch) return true;
	return `${label} ${abilityLabel}`.toLocaleLowerCase().includes(normalizedSearch);
}

export function rollMatchesCategory(category: RollCategory, filter: RollFilter) {
	if (filter === "all") return true;
	if (filter === "checks") return category === "ability-check" || category === "skill";
	if (filter === "saves") return category === "saving-throw";
	return category === "initiative" || category === "passive";
}

export type RollFilter = "all" | "checks" | "saves" | "other";
