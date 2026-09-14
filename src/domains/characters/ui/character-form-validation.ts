import { CHARACTER_CLASSES, type CharacterClass } from "../types/index.js";
export function validateCharacterName(value: string) {
	const trimmed = value.trim();
	if (trimmed.length === 0) return "Name is required";
	if (trimmed.length > 120) return "Name must be 120 characters or fewer";
	return null;
}

export function validateCharacterClass(value: CharacterClass | "") {
	if (!CHARACTER_CLASSES.includes(value as CharacterClass)) return "Class is required";
	return null;
}

export function validateCharacterLevel(value: number | string) {
	const level = Number(value);
	if (!Number.isInteger(level) || level < 1 || level > 20) {
		return "Level must be a whole number from 1 to 20";
	}
	return null;
}
