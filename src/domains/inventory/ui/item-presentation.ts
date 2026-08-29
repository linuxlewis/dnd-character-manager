import type { LucideIcon } from "lucide-react";
import { FlaskConical, Package, ScrollText, Sparkles, Sword } from "lucide-react";
import type { CatalogueItemKind } from "../../catalogue/types/index.js";
import type {
	InventoryItem,
	InventoryItemRarity,
	InventoryItemType,
	JsonValue,
} from "../types/index.js";

export const INVENTORY_ITEM_TYPES: InventoryItemType[] = [
	"equipment",
	"potion",
	"scroll",
	"consumable",
	"misc",
];

export const ITEM_TYPE_LABELS: Record<InventoryItemType, string> = {
	equipment: "Equipment",
	potion: "Potion",
	scroll: "Scroll",
	consumable: "Consumable",
	misc: "Misc",
};

export const ITEM_RARITY_LABELS: Record<InventoryItemRarity, string> = {
	common: "Common",
	uncommon: "Uncommon",
	rare: "Rare",
	very_rare: "Very Rare",
	legendary: "Legendary",
	artifact: "Artifact",
};

export interface ItemRarityStyle {
	color: string;
	background: string;
	border: string;
}

export const ITEM_RARITY_STYLES: Record<InventoryItemRarity, ItemRarityStyle> = {
	common: { color: "gray", background: "gray.9", border: "gray.6" },
	uncommon: { color: "green", background: "green.9", border: "green.6" },
	rare: { color: "blue", background: "blue.9", border: "blue.6" },
	very_rare: { color: "grape", background: "grape.9", border: "grape.6" },
	legendary: { color: "orange", background: "orange.9", border: "orange.6" },
	artifact: { color: "red", background: "red.9", border: "red.6" },
};

const ITEM_TYPE_ICONS: Record<InventoryItemType, LucideIcon> = {
	equipment: Sword,
	potion: FlaskConical,
	scroll: ScrollText,
	consumable: Sparkles,
	misc: Package,
};

export function getItemTypeIcon(type: InventoryItemType) {
	return ITEM_TYPE_ICONS[type];
}

export function getItemTypeLabel(type: InventoryItemType) {
	return ITEM_TYPE_LABELS[type];
}

export function getItemRarityLabel(rarity: InventoryItemRarity | null) {
	return rarity ? ITEM_RARITY_LABELS[rarity] : "Unrated";
}

export function getItemRarityStyle(rarity: InventoryItemRarity | null): ItemRarityStyle {
	return rarity ? ITEM_RARITY_STYLES[rarity] : ITEM_RARITY_STYLES.common;
}

export function inventoryTypeForCatalogueKind(kind: CatalogueItemKind): InventoryItemType {
	if (kind === "potion") return "potion";
	if (kind === "scroll") return "scroll";
	if (kind === "consumable") return "consumable";
	if (["weapon", "armor", "magic-item", "tool"].includes(kind)) return "equipment";
	return "misc";
}

export function formatItemNumber(value: number | null, suffix: string) {
	if (value === null) return null;
	return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${suffix}`;
}

export function formatItemProperty(value: JsonValue) {
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
}

export function getItemStatEntries(item: InventoryItem) {
	const stats = item.properties.stats;
	if (!isRecord(stats)) return [];
	return Object.entries(stats)
		.filter(([, value]) => value !== null && value !== undefined)
		.slice(0, 8)
		.map(([label, value]) => ({ label: formatLabel(label), value: formatItemProperty(value) }));
}

export function formatLabel(value: string) {
	return value
		.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
		.replaceAll(/[_-]+/g, " ")
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRecord(value: JsonValue | undefined): value is Record<string, JsonValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
