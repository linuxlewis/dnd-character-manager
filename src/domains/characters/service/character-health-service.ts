import type { CharacterHealthRepository, NewHealthChange } from "../repo/index.js";
import { createCharacterHealthRepository } from "../repo/index.js";
import type {
	CharacterHealth,
	UpdateCharacterHealthRequest,
	UpdateCharacterHealthResponse,
} from "../types/index.js";
import { CharacterHealthSchema } from "../types/index.js";
import { CharacterNotFoundError } from "./character-errors.js";

export interface CharacterHealthService {
	updateCharacterHealth(
		userId: string,
		characterId: string,
		input: UpdateCharacterHealthRequest,
	): Promise<UpdateCharacterHealthResponse>;
}

export function createCharacterHealthService(
	repository: CharacterHealthRepository = createCharacterHealthRepository(),
): CharacterHealthService {
	return {
		async updateCharacterHealth(userId, characterId, input) {
			const result = await repository.mutateCharacterHealth(userId, characterId, (previous) => {
				const currentHpDelta = input.currentHpDelta;
				const isCurrentHpAction = currentHpDelta !== undefined && currentHpDelta !== 0;
				const next = normalizeHealthUpdate(
					previous,
					isCurrentHpAction
						? {
								currentHp: clamp(previous.currentHp + (currentHpDelta ?? 0), 0, 9999),
								maxHp: previous.maxHp,
								temporaryHp: previous.temporaryHp,
							}
						: {
								...input,
								currentHp:
									input.currentHpDelta === undefined ? input.currentHp : previous.currentHp,
							},
				);
				return { health: next, change: toHealthChange(previous, next) };
			});
			if (!result) throw new CharacterNotFoundError();
			return result;
		},
	};
}

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
