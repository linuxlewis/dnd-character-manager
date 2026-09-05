import type { CharacterHistoryEntry } from "../types/index.js";
import { formatItemHistoryEntry } from "./activity-format-item.js";
import {
	type ActivityDateGroup,
	type ActivityFilter,
	createMalformedActivityEntry,
	type FormattedActivityEntry,
	isMalformedHistoryEntry,
} from "./activity-format-shared.js";
import { formatCurrencyHistoryEntry } from "./activity-format-treasury.js";

export type {
	ActivityDateGroup,
	ActivityFilter,
	ActivityIconKind,
	ActivityTone,
	FormattedActivityEntry,
} from "./activity-format-shared.js";

export function formatHistoryEntry(entry: CharacterHistoryEntry): FormattedActivityEntry {
	try {
		if (isMalformedHistoryEntry(entry)) return createMalformedActivityEntry();
		if (entry.entityType === "item") return formatItemHistoryEntry(entry);
		if (entry.entityType === "currency") return formatCurrencyHistoryEntry(entry);
	} catch {
		return createMalformedActivityEntry();
	}
	return createMalformedActivityEntry();
}

export function formatRelativeTime(dateInput: string, now = new Date()): string {
	const date = new Date(dateInput);
	const difference = now.getTime() - date.getTime();
	if (!Number.isFinite(difference) || difference < 0) return "just now";

	const seconds = Math.floor(difference / 1_000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	if (seconds < 60) return "just now";
	if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	if (days === 1) return "yesterday";
	if (days < 7) return `${days} days ago`;
	return formatFullTimestamp(dateInput);
}

export function formatFullTimestamp(dateInput: string): string {
	const date = new Date(dateInput);
	return Number.isNaN(date.getTime()) ? "Timestamp unavailable" : date.toLocaleString();
}

export function groupActivityEntries(
	entries: CharacterHistoryEntry[],
	now = new Date(),
): ActivityDateGroup[] {
	const groups = new Map<string, ActivityDateGroup>();
	for (const entry of dedupeActivityEntries(entries)) {
		const date = new Date(entry.createdAt);
		const key = Number.isNaN(date.getTime()) ? "invalid-date" : localDateKey(date);
		const group = groups.get(key) ?? {
			entries: [],
			key,
			label: formatDateGroupLabel(date, now),
		};
		group.entries.push(entry);
		groups.set(key, group);
	}
	return [...groups.values()];
}

export function dedupeActivityEntries(entries: CharacterHistoryEntry[]) {
	const seen = new Set<string>();
	return entries.filter((entry) => {
		if (seen.has(entry.id)) return false;
		seen.add(entry.id);
		return true;
	});
}

export function appendActivityPage(
	loadedEntries: CharacterHistoryEntry[],
	pageEntries: CharacterHistoryEntry[],
) {
	return dedupeActivityEntries([...loadedEntries, ...pageEntries]);
}

export function formatHistoryQuery(filter: ActivityFilter, offset: number, limit: number) {
	return {
		limit,
		offset,
		...(filter === "items" ? { entityType: "item" as const } : {}),
		...(filter === "treasury" ? { entityType: "currency" as const } : {}),
	};
}

export function getActivityFilterLabel(filter: ActivityFilter) {
	if (filter === "items") return "item";
	if (filter === "treasury") return "treasury";
	return "activity";
}

function formatDateGroupLabel(date: Date, now: Date) {
	if (Number.isNaN(date.getTime())) return "Date unavailable";
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const difference = Math.round(
		(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
			Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())) /
			86_400_000,
	);
	if (difference === 0) return "Today";
	if (difference === 1) return "Yesterday";
	return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function localDateKey(date: Date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
