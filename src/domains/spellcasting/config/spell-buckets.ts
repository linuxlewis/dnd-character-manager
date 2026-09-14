import { SpellSlotUnavailableError } from "../types/index.js";
export function assertSpellCanSaveToBucket(
	spell: { level: number; source: "feature" | "spell" },
	slotLevel: number,
) {
	if (spell.source === "feature") {
		if (slotLevel !== 0) {
			throw new SpellSlotUnavailableError("Features must be saved outside spell slots.");
		}
		return;
	}

	if (slotLevel === 0) {
		if (spell.level !== 0) {
			throw new SpellSlotUnavailableError("Leveled spells require a spell slot.");
		}
		return;
	}

	if (spell.level === 0) {
		throw new SpellSlotUnavailableError("Cantrips must be saved outside spell slots.");
	}

	if (spell.level > slotLevel) {
		throw new SpellSlotUnavailableError("Spell level is too high for this slot.");
	}
}
