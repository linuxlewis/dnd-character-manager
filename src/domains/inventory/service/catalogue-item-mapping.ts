import type { InventoryItemBase, InventoryItemType, JsonObject } from "../types/index.js";
import type { CatalogueItemSnapshot } from "./catalogue-item-client.js";

export type CatalogueOwnedItemFields = Pick<
	InventoryItemBase,
	| "name"
	| "type"
	| "category"
	| "rarity"
	| "description"
	| "weight"
	| "estimatedValue"
	| "thumbnailUrl"
	| "properties"
> & {
	catalogueItemId: string;
	catalogueSourceKey: string;
	catalogueRulesVersion: string;
};

export function mapCatalogueItemToInventoryItem(
	item: CatalogueItemSnapshot,
): CatalogueOwnedItemFields {
	return {
		name: item.name,
		type: inventoryTypeForCatalogueKind(item.kind),
		category: item.category,
		rarity: item.rarity,
		description: item.description.trim() || null,
		weight: item.weight,
		estimatedValue: toGoldValue(item.costValue, item.costDenomination),
		thumbnailUrl: item.thumbnailUrl,
		properties: {
			catalogueKind: item.kind,
			isMagical: item.isMagical,
			requiresAttunement: item.requiresAttunement,
			tags: item.properties,
			cost: { value: item.costValue, denomination: item.costDenomination },
			stats: item.stats,
		} satisfies JsonObject,
		catalogueItemId: item.id,
		catalogueSourceKey: item.sourceKey,
		catalogueRulesVersion: item.rulesVersion,
	};
}

function inventoryTypeForCatalogueKind(kind: CatalogueItemSnapshot["kind"]): InventoryItemType {
	if (kind === "potion") return "potion";
	if (kind === "scroll") return "scroll";
	if (kind === "consumable") return "consumable";
	if (["weapon", "armor", "magic-item", "tool"].includes(kind)) return "equipment";
	return "misc";
}

function toGoldValue(value: number | null, denomination: string | null) {
	if (value === null || denomination === null) return null;
	const multipliers: Record<string, number> = {
		cp: 0.01,
		copper: 0.01,
		sp: 0.1,
		silver: 0.1,
		gp: 1,
		gold: 1,
		pp: 10,
		platinum: 10,
	};
	const multiplier = multipliers[denomination.trim().toLowerCase()];
	return multiplier === undefined ? null : value * multiplier;
}
