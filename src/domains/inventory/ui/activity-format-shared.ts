import type { CharacterHistoryEntry } from "../types/index.js";

export type ActivityFilter = "all" | "items" | "treasury";
export type ActivityIconKind = "coins" | "pencil" | "trash" | "item";
export type ActivityTone = "positive" | "neutral" | "negative" | "treasury";

export interface FormattedActivityEntry {
	accessibleDetail: string | null;
	accessibleSummary: string;
	detail: string | null;
	icon: ActivityIconKind;
	itemType: "equipment" | "potion" | "scroll" | "consumable" | "misc" | null;
	note: string | null;
	summary: string;
	tone: ActivityTone;
	valueTone?: "positive" | "neutral" | "negative";
}

export interface ActivityDateGroup {
	entries: CharacterHistoryEntry[];
	key: string;
	label: string;
}

export function createMalformedActivityEntry(): FormattedActivityEntry {
	return {
		accessibleDetail: null,
		accessibleSummary: "This activity entry cannot be displayed.",
		detail: null,
		icon: "trash",
		itemType: null,
		note: null,
		summary: "This activity entry cannot be displayed.",
		tone: "neutral",
		valueTone: "neutral",
	};
}

export function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

export function isPositiveInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
