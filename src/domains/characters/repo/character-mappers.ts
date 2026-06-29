import { z } from "zod";
import type {
	CharacterDetail,
	CharacterHealth,
	CharacterSummary,
	HealthChangeResponse,
} from "../types/index.js";
import {
	CharacterDetailSchema,
	CharacterHealthSchema,
	CharacterSummarySchema,
	HealthChangeResponseSchema,
} from "../types/index.js";

const CharacterRowSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	className: z.string(),
	level: z.number().int(),
});

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

export function toCharacterSummary(row: unknown): CharacterSummary {
	return CharacterSummarySchema.parse(CharacterRowSchema.parse(row));
}

export function toCharacterDetail(
	row: unknown,
	recentHealthChanges: HealthChangeResponse[],
): CharacterDetail {
	const character = CharacterRowSchema.merge(HealthRowSchema).parse(row);
	return CharacterDetailSchema.parse({
		id: character.id,
		name: character.name,
		className: character.className,
		level: character.level,
		health: toCharacterHealth(character),
		recentHealthChanges,
	});
}

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
