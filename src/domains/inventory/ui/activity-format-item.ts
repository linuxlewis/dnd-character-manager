import type { CharacterHistoryEntry } from "../types/index.js";
import {
	asRecord,
	createMalformedActivityEntry,
	type FormattedActivityEntry,
	isPositiveInteger,
} from "./activity-format-shared.js";

type ItemType = "equipment" | "potion" | "scroll" | "consumable" | "misc";
type ItemSnapshot = {
	category: string;
	estimatedValue: number | null;
	isEquipped: boolean;
	name: string;
	notes: string | null;
	quantity: number;
	rarity: string | null;
	type: ItemType;
	weight: number | null;
};

const FIELD_LABELS: Record<string, string> = {
	category: "Category",
	estimatedValue: "Value",
	isEquipped: "Equipped",
	name: "Name",
	notes: "Notes",
	rarity: "Rarity",
	quantity: "Quantity",
	type: "Type",
	weight: "Weight",
};

export function formatItemHistoryEntry(entry: CharacterHistoryEntry): FormattedActivityEntry {
	const details = asRecord(entry.details);
	if (!details || details.version !== 1) return createMalformedActivityEntry();

	if (entry.action === "item_added" || entry.action === "item_removed") {
		const item = toItemSnapshot(details.item);
		if (!item) return createMalformedActivityEntry();
		const verb = entry.action === "item_added" ? "Added" : "Removed";
		return {
			...baseItemPresentation(item, `${verb} ${item.name}`),
			accessibleDetail: formatItemSnapshot(item),
			detail: formatItemSnapshot(item),
			note: item.notes,
			tone: entry.action === "item_added" ? "positive" : "negative",
			valueTone: entry.action === "item_added" ? "positive" : "negative",
		};
	}

	if (entry.action !== "item_updated") return createMalformedActivityEntry();
	const before = toItemSnapshot(details.before);
	const after = toItemSnapshot(details.after);
	const changedFields = toChangedFields(details.changedFields);
	if (!before || !after || !changedFields || changedFields.length === 0) {
		return createMalformedActivityEntry();
	}

	if (changedFields.length === 1 && changedFields[0] === "isEquipped") {
		const verb = after.isEquipped ? "Equipped" : "Unequipped";
		return {
			...baseItemPresentation(after, `${verb} ${after.name}`),
			accessibleDetail: `${formatItemType(after.type)} | ${after.category}`,
			detail: `${formatItemType(after.type)} | ${after.category}`,
			note: after.notes,
			tone: after.isEquipped ? "positive" : "neutral",
			valueTone: after.isEquipped ? "positive" : "neutral",
		};
	}

	const changes = changedFields.map((field) => formatChangedField(field, before, after));
	const shownChanges = changes.slice(0, 2);
	const moreChanges = Math.max(0, changes.length - shownChanges.length);
	const detail = [...shownChanges, moreChanges > 0 ? `+${moreChanges} more changes` : null]
		.filter((value): value is string => value !== null)
		.join(" | ");
	return {
		...baseItemPresentation(after, `Updated ${after.name}`),
		note: changedFields.includes("notes") ? after.notes : null,
		icon: "pencil",
		accessibleDetail: detail || null,
		detail: detail || null,
		tone: "neutral",
		valueTone: "neutral",
	};
}

function baseItemPresentation(item: ItemSnapshot, summary: string): FormattedActivityEntry {
	return {
		accessibleDetail: null,
		accessibleSummary: summary,
		detail: null,
		icon: "item",
		itemType: item.type,
		note: null,
		summary,
		tone: "neutral",
	};
}

function formatItemSnapshot(item: ItemSnapshot) {
	const parts = [
		item.rarity && item.rarity !== "common" ? formatRarity(item.rarity) : null,
		item.quantity !== 1 ? `x${item.quantity.toLocaleString()}` : null,
		item.weight === null ? null : `${formatNumber(item.weight)} lb`,
		item.estimatedValue === null ? null : `${formatNumber(item.estimatedValue)} GP`,
	].filter((value): value is string => value !== null);
	return parts.length > 0 ? parts.join(" | ") : null;
}

function formatChangedField(field: ItemField, before: ItemSnapshot, after: ItemSnapshot) {
	if (field === "notes") return "Notes updated";
	const label = FIELD_LABELS[field];
	const beforeValue = formatItemFieldValue(field, before[field as keyof ItemSnapshot]);
	const afterValue = formatItemFieldValue(field, after[field as keyof ItemSnapshot]);
	return `${label} ${beforeValue} -> ${afterValue}`;
}

function formatItemFieldValue(field: ItemField, value: unknown) {
	if (value === null || value === undefined || value === "") return "not listed";
	if (field === "rarity") return formatRarity(String(value));
	if (field === "weight") return `${formatNumber(Number(value))} lb`;
	if (field === "estimatedValue") return `${formatNumber(Number(value))} GP`;
	if (field === "isEquipped") return value === true ? "equipped" : "not equipped";
	return String(value);
}

function formatItemType(type: ItemType) {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatRarity(value: string) {
	return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value: number) {
	return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toItemSnapshot(value: unknown): ItemSnapshot | null {
	const item = asRecord(value);
	if (
		!item ||
		!isNonEmptyText(item.id) ||
		!isNonEmptyText(item.name) ||
		!isNonEmptyText(item.category) ||
		!isItemType(item.type) ||
		!isPositiveInteger(item.quantity) ||
		typeof item.isEquipped !== "boolean" ||
		(item.rarity !== null && !isItemRarity(item.rarity)) ||
		(item.weight !== null && !isNonNegativeFiniteNumber(item.weight)) ||
		(item.estimatedValue !== null && !isNonNegativeFiniteNumber(item.estimatedValue)) ||
		(item.notes !== undefined && item.notes !== null && !isSafeNote(item.notes))
	) {
		return null;
	}
	return {
		category: item.category,
		estimatedValue: item.estimatedValue as number | null,
		isEquipped: item.isEquipped,
		name: item.name,
		notes: item.notes === undefined || item.notes === null ? null : item.notes.trim(),
		quantity: item.quantity,
		rarity: item.rarity as string | null,
		type: item.type,
		weight: item.weight as number | null,
	};
}

function toChangedFields(value: unknown): ItemField[] | null {
	if (!Array.isArray(value)) return null;
	const fields = value.filter((field): field is ItemField => isItemField(field));
	return fields.length === value.length ? fields : null;
}

function isItemType(value: unknown): value is ItemType {
	return (
		value === "equipment" ||
		value === "potion" ||
		value === "scroll" ||
		value === "consumable" ||
		value === "misc"
	);
}

type ItemField =
	| "category"
	| "estimatedValue"
	| "isEquipped"
	| "name"
	| "notes"
	| "quantity"
	| "rarity"
	| "type"
	| "weight";

function isItemField(value: unknown): value is ItemField {
	return (
		value === "category" ||
		value === "estimatedValue" ||
		value === "isEquipped" ||
		value === "name" ||
		value === "notes" ||
		value === "quantity" ||
		value === "rarity" ||
		value === "type" ||
		value === "weight"
	);
}

function isItemRarity(value: unknown): value is string {
	return (
		value === "common" ||
		value === "uncommon" ||
		value === "rare" ||
		value === "very_rare" ||
		value === "legendary" ||
		value === "artifact"
	);
}

function isNonEmptyText(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0 && value.length <= 120;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isSafeNote(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0 && value.length <= 500;
}
