import {
	type CharacterHealth,
	CharacterHealthSchema,
	type NewHealthChange,
	type UpdateCharacterHealthRequest,
} from "../types/index.js";
export function normalizeHealthUpdate(
	previous: CharacterHealth,
	input: UpdateCharacterHealthRequest,
): CharacterHealth {
	const temporaryHpDelta = input.temporaryHp - previous.temporaryHp;
	const maxHpDelta = input.maxHp - previous.maxHp;
	const effectiveMaxHp = input.maxHp + input.temporaryHp;
	const currentHpBeforeClamp =
		input.currentHp + Math.max(maxHpDelta, 0) + Math.max(temporaryHpDelta, 0);

	return CharacterHealthSchema.parse({
		currentHp: clamp(currentHpBeforeClamp, 0, effectiveMaxHp),
		maxHp: input.maxHp,
		temporaryHp: input.temporaryHp,
		effectiveMaxHp,
	});
}

export function toHealthChange(
	previous: CharacterHealth,
	next: CharacterHealth,
): NewHealthChange | null {
	const change = {
		previous,
		next,
		currentHpDelta: next.currentHp - previous.currentHp,
		maxHpDelta: next.maxHp - previous.maxHp,
		temporaryHpDelta: next.temporaryHp - previous.temporaryHp,
	};

	if (change.currentHpDelta === 0 && change.maxHpDelta === 0 && change.temporaryHpDelta === 0) {
		return null;
	}

	return change;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}
