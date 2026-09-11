import {
	buildCharacterAttributes as buildCharacterAttributesFromTypes,
	buildRollReference as buildRollReferenceFromTypes,
	type CharacterAttributes,
	type CharacterRollCalculationInput,
	type RollReference,
	type RollReferenceConfiguration,
} from "../types/character-rolls.js";
import {
	CHARACTER_ABILITIES,
	CHARACTER_SKILLS,
	getProficiencyBonus,
} from "./character-attributes.js";

const CHARACTER_ROLL_CONFIGURATION: RollReferenceConfiguration = {
	abilities: CHARACTER_ABILITIES,
	skills: CHARACTER_SKILLS,
	getProficiencyBonus,
};

export function buildRollReference(input: CharacterRollCalculationInput): RollReference {
	return buildRollReferenceFromTypes(input, CHARACTER_ROLL_CONFIGURATION);
}

export function buildCharacterAttributes(
	input: CharacterRollCalculationInput,
): CharacterAttributes {
	return buildCharacterAttributesFromTypes(input, CHARACTER_ROLL_CONFIGURATION);
}
