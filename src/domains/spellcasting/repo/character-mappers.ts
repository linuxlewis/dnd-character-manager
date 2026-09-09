import { z } from "zod";
import type {
	CharacterSpell,
	CharacterSpellSlot,
	SpellSlotChangeResponse,
} from "../types/index.js";
import {
	CharacterSpellSchema,
	CharacterSpellSlotSchema,
	SpellSlotActionSchema,
	SpellSlotChangeResponseSchema,
} from "../types/index.js";

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
