import type { SpellSlotChangeResponse } from "../types/index.js";

export function formatSpellSlotChange(change: SpellSlotChangeResponse) {
	if (change.action === "used") return `Used ${formatSpellLevel(change.level)} slot`;
	if (change.action === "restored") return `Restored ${formatSpellLevel(change.level)} slot`;
	if (change.action === "defaults-applied") {
		return `Applied defaults for ${formatSpellLevel(change.level)}: ${change.next.total} slots`;
	}
	return `Configured ${formatSpellLevel(change.level)}: ${change.next.total} slots`;
}

export function formatSpellLevel(level: number) {
	const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
	return `${level}${suffix}-level`;
}
