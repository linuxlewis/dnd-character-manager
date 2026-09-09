export function formatSpellLevel(level: number) {
	if (level === 0) return "cantrip";
	const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
	return `${level}${suffix}-level`;
}

export function formatSpellEntryDetail(entry: { level: number; source: "feature" | "spell" }) {
	if (entry.source === "feature") return `${formatSpellLevel(entry.level)} feature`;
	if (entry.level === 0) return "Cantrip";
	return `${formatSpellLevel(entry.level)} spell`;
}
