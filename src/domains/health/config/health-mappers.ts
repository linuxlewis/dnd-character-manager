import { z } from "zod";
import {
	type CharacterHealth,
	CharacterHealthSchema,
	type HealthChangeResponse,
	HealthChangeResponseSchema,
} from "../types/index.js";

const HealthRowSchema = z.object({
	currentHp: z.number().int(),
	maxHp: z.number().int(),
	temporaryHp: z.number().int(),
});

const HealthChangeRowSchema = z.object({
	id: z.string().uuid(),
	previousCurrentHp: z.number().int(),
	nextCurrentHp: z.number().int(),
	previousMaxHp: z.number().int(),
	nextMaxHp: z.number().int(),
	previousTemporaryHp: z.number().int(),
	nextTemporaryHp: z.number().int(),
	currentHpDelta: z.number().int(),
	maxHpDelta: z.number().int(),
	temporaryHpDelta: z.number().int(),
	createdAt: z.union([z.date(), z.string()]),
});

export function toCharacterHealth(row: unknown): CharacterHealth {
	const health = HealthRowSchema.parse(row);
	return CharacterHealthSchema.parse({
		...health,
		effectiveMaxHp: health.maxHp + health.temporaryHp,
	});
}

export function toHealthChange(row: unknown): HealthChangeResponse {
	const change = HealthChangeRowSchema.parse(row);
	return HealthChangeResponseSchema.parse({
		id: change.id,
		previous: {
			currentHp: change.previousCurrentHp,
			maxHp: change.previousMaxHp,
			temporaryHp: change.previousTemporaryHp,
			effectiveMaxHp: change.previousMaxHp + change.previousTemporaryHp,
		},
		next: {
			currentHp: change.nextCurrentHp,
			maxHp: change.nextMaxHp,
			temporaryHp: change.nextTemporaryHp,
			effectiveMaxHp: change.nextMaxHp + change.nextTemporaryHp,
		},
		currentHpDelta: change.currentHpDelta,
		maxHpDelta: change.maxHpDelta,
		temporaryHpDelta: change.temporaryHpDelta,
		createdAt: toIsoString(change.createdAt),
	});
}

function toIsoString(value: Date | string) {
	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
