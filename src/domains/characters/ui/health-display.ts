import type { CharacterHealth, HealthChangeResponse } from "../types/index.js";

export function getHealthColor(health: CharacterHealth) {
	const ratio = health.currentHp / health.effectiveMaxHp;
	if (ratio <= 0.25) return "red";
	if (ratio <= 0.5) return "orange";
	if (ratio <= 0.75) return "yellow";
	return "green";
}

export function formatHealthChange(change: HealthChangeResponse) {
	const parts = [
		formatDelta("HP", change.currentHpDelta),
		formatDelta("Max HP", change.maxHpDelta),
		formatDelta("Temp HP", change.temporaryHpDelta),
	].filter((part) => part.length > 0);

	return parts.length > 0 ? parts.join(", ") : "No HP change";
}

function formatDelta(label: string, delta: number) {
	if (delta === 0) return "";
	const sign = delta > 0 ? "+" : "";
	return `${label} ${sign}${delta}`;
}
