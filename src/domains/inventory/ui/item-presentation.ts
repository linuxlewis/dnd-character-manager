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
	const entries = [];
	const damage = formatDamageStat(stats.damage);
	if (damage) entries.push({ label: "Damage", value: damage });
	const armorClass = formatArmorClassStat(stats.armor);
	if (armorClass) entries.push({ label: "AC", value: armorClass });

	for (const [label, value] of Object.entries(stats)) {
		if (["armor", "baseItem", "damage", "itemType"].includes(label)) continue;
		const formattedValue = formatSimpleStatValue(value);
		if (formattedValue) entries.push({ label: formatLabel(label), value: formattedValue });
	}

	return entries.slice(0, 8);
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

function formatDamageStat(value: JsonValue | undefined) {
	if (value === undefined || value === null) return null;
	if (!isRecord(value)) return formatSimpleStatValue(value);

	if (Array.isArray(value.parts)) {
		const parts = value.parts.map(formatDamagePart).filter((part): part is string => part !== null);
		return parts.length > 0 ? parts.join(" + ") : null;
	}

	const base = formatDamagePart(value.base ?? value);
	if (!base) return null;
	const versatile = formatDamagePart(value.versatile);
	return versatile && versatile !== base ? `${base} (versatile ${versatile})` : base;
}

function formatDamagePart(value: JsonValue | undefined) {
	if (value === undefined || value === null) return null;
	if (!isRecord(value)) return formatSimpleStatValue(value);

	const dice = formatDice(value);
	const types = formatDamageTypes(value.types ?? value.damage_type ?? value.type);
	if (dice && types) return `${dice} ${types}`;
	return dice ?? types;
}

function formatDice(value: Record<string, JsonValue>) {
	const directDice = value.damage_dice ?? value.dice;
	if (typeof directDice === "string" || typeof directDice === "number") return String(directDice);

	const number = value.number;
	const denomination = value.denomination;
	if (
		(typeof number === "string" || typeof number === "number") &&
		(typeof denomination === "string" || typeof denomination === "number")
	) {
		return `${number}${denomination}`;
	}
	return null;
}

function formatDamageTypes(value: JsonValue | undefined) {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) {
		const types = value.filter((type): type is string => typeof type === "string");
		return types.length > 0 ? types.join(", ") : null;
	}
	if (isRecord(value)) {
		const name = value.name;
		return typeof name === "string" ? name : null;
	}
	return null;
}

function formatArmorClassStat(value: JsonValue | undefined) {
	if (value === undefined || value === null) return null;
	if (typeof value === "string" || typeof value === "number") return String(value);
	if (!isRecord(value)) return null;

	const base = value.value ?? value.base ?? value.ac;
	const formattedBase = formatSimpleStatValue(base);
	if (!formattedBase) return null;
	const suffixes = [];
	const dexterity = value.dex ?? value.dex_bonus;
	if (dexterity === true) suffixes.push("Dex");
	if (typeof dexterity === "number" && dexterity > 0) suffixes.push(`Dex (max ${dexterity})`);
	const magicalBonus = value.magicalBonus ?? value.magical_bonus;
	if (typeof magicalBonus === "number" && magicalBonus !== 0) {
		suffixes.push(`${magicalBonus > 0 ? "+" : "-"}${Math.abs(magicalBonus)} magic`);
	}
	return suffixes.length > 0 ? `${formattedBase} + ${suffixes.join(" + ")}` : formattedBase;
}

function formatSimpleStatValue(value: JsonValue | undefined): string | null {
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		const values = value
			.map((entry) => formatSimpleStatValue(entry))
			.filter((entry): entry is string => entry !== null);
		return values.length > 0 ? values.join(", ") : null;
	}
	return null;
}
