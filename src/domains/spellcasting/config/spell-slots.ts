import {
	type CharacterSpellSlot,
	CharacterSpellSlotSchema,
	type NewSpellSlotChange,
	SpellSlotUnavailableError,
	type UpdateCharacterSpellSlotsRequest,
	type UseCharacterSpellSlotRequest,
} from "../types/index.js";
export function normalizeSpellSlotConfiguration(
	previous: CharacterSpellSlot[],
	input: UpdateCharacterSpellSlotsRequest,
	action: "configured" | "defaults-applied" = "configured",
): { next: CharacterSpellSlot[]; events: NewSpellSlotChange[] } {
	const configuredByLevel = new Map(input.slots.map((slot) => [slot.level, slot.total]));
	const next = previous.map((slot) => {
		const total = configuredByLevel.get(slot.level) ?? slot.total;
		return toSpellSlot(slot.level, total, Math.min(slot.used, total));
	});
	const events = next
		.map((slot, index) => toSpellSlotChange(action, previous[index], slot))
		.filter((event): event is NewSpellSlotChange => event !== null);

	return { next, events };
}

export function applySpellSlotChange(
	previous: CharacterSpellSlot[],
	input: UseCharacterSpellSlotRequest,
	action: "used" | "restored",
): { next: CharacterSpellSlot[]; event: NewSpellSlotChange } {
	const slot = previous.find((candidate) => candidate.level === input.level);
	if (!slot) throw new SpellSlotUnavailableError("Spell slot level is not configured.");

	if (action === "used" && slot.remaining <= 0) {
		throw new SpellSlotUnavailableError("No spell slots remain.");
	}
	if (action === "restored" && slot.used <= 0) {
		throw new SpellSlotUnavailableError("No used spell slots to restore.");
	}

	const changedSlot = toSpellSlot(
		slot.level,
		slot.total,
		action === "used" ? slot.used + 1 : slot.used - 1,
	);
	const next = previous.map((candidate) =>
		candidate.level === input.level ? changedSlot : candidate,
	);
	const event = toSpellSlotChange(action, slot, changedSlot);
	if (!event) throw new SpellSlotUnavailableError();

	return { next, event };
}

function toSpellSlot(level: number, total: number, used: number) {
	return CharacterSpellSlotSchema.parse({
		level,
		total,
		used,
		remaining: total - used,
	});
}

function toSpellSlotChange(
	action: NewSpellSlotChange["action"],
	previous: CharacterSpellSlot,
	next: CharacterSpellSlot,
): NewSpellSlotChange | null {
	const totalDelta = next.total - previous.total;
	const usedDelta = next.used - previous.used;
	if (totalDelta === 0 && usedDelta === 0) return null;
	return {
		action,
		level: next.level,
		previous,
		next,
		totalDelta,
		usedDelta,
	};
}
