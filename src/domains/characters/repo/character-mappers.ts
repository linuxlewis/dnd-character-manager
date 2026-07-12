import { z } from "zod";
import type {
	CharacterDetail,
	CharacterHealth,
	CharacterSpell,
	CharacterSpellSlot,
	CharacterSummary,
	HealthChangeResponse,
	SpellSlotChangeResponse,
} from "../types/index.js";
import {
	CharacterDetailSchema,
	CharacterHealthSchema,
	CharacterSpellSchema,
	CharacterSpellSlotSchema,
	CharacterSummarySchema,
	HealthChangeResponseSchema,
	SpellSlotActionSchema,
	SpellSlotChangeResponseSchema,
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

const SpellSlotRowSchema = z.object({
	spellLevel: z.number().int(),
	totalSlots: z.number().int(),
	usedSlots: z.number().int(),
});

const SpellSlotChangeRowSchema = z.object({
	id: z.string().uuid(),
	action: SpellSlotActionSchema,
	spellLevel: z.number().int(),
	previousTotalSlots: z.number().int(),
	nextTotalSlots: z.number().int(),
	previousUsedSlots: z.number().int(),
	nextUsedSlots: z.number().int(),
	totalSlotsDelta: z.number().int(),
	usedSlotsDelta: z.number().int(),
	createdAt: z.union([z.date(), z.string()]),
});

const CharacterSpellRowSchema = z.object({
	id: z.string().uuid(),
	slotLevel: z.number().int(),
	spellSource: z.enum(["spell", "feature"]).default("spell"),
	spellIndex: z.string(),
	spellName: z.string(),
	spellLevel: z.number().int(),
	spellUrl: z.string(),
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

export function toSpellSlotState(row: unknown): CharacterSpellSlot {
	const slot = SpellSlotRowSchema.parse(row);
	return CharacterSpellSlotSchema.parse({
		level: slot.spellLevel,
		total: slot.totalSlots,
		used: slot.usedSlots,
		remaining: slot.totalSlots - slot.usedSlots,
	});
}

export function toSpellSlotChange(row: unknown): SpellSlotChangeResponse {
	const change = SpellSlotChangeRowSchema.parse(row);
	return SpellSlotChangeResponseSchema.parse({
		id: change.id,
		action: change.action,
		level: change.spellLevel,
		previous: {
			total: change.previousTotalSlots,
			used: change.previousUsedSlots,
			remaining: change.previousTotalSlots - change.previousUsedSlots,
		},
		next: {
			total: change.nextTotalSlots,
			used: change.nextUsedSlots,
			remaining: change.nextTotalSlots - change.nextUsedSlots,
		},
		totalDelta: change.totalSlotsDelta,
		usedDelta: change.usedSlotsDelta,
		createdAt: toIsoString(change.createdAt),
	});
}

export function toCharacterSpell(row: unknown): CharacterSpell {
	const spell = CharacterSpellRowSchema.parse(row);
	return CharacterSpellSchema.parse({
		id: spell.id,
		slotLevel: spell.slotLevel,
		spellIndex: spell.spellIndex,
		name: spell.spellName,
		level: spell.spellLevel,
		url: spell.spellUrl,
		source: spell.spellSource,
	});
}

function toIsoString(value: Date | string) {
	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
