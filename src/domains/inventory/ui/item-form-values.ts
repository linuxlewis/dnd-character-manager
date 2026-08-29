import type {
	CreateCharacterItemRequest,
	UpdateCharacterItemRequest,
} from "../../../generated/api-client.generated.js";
import type {
	CatalogueItemDetails,
	CatalogueItemSearchResult,
} from "../../catalogue/types/index.js";
import type {
	InventoryItem,
	InventoryItemRarity,
	InventoryItemType,
	JsonObject,
} from "../types/index.js";
import { inventoryTypeForCatalogueKind } from "./item-presentation.js";

export interface ItemFormValues {
	name: string;
	type: InventoryItemType;
	category: string;
	rarity: InventoryItemRarity | null;
	description: string;
	quantity: number | string;
	weight: number | string;
	estimatedValue: number | string;
	notes: string;
	thumbnailUrl: string;
	properties: JsonObject;
}

export function initialItemFormValues(item?: InventoryItem): ItemFormValues {
	return {
		name: item?.name ?? "",
		type: item?.type ?? "misc",
		category: item?.category ?? "Miscellaneous",
		rarity: item?.rarity ?? null,
		description: item?.description ?? "",
		quantity: item?.quantity ?? 1,
		weight: item?.weight ?? "",
		estimatedValue: item?.estimatedValue ?? "",
		notes: item?.notes ?? "",
		thumbnailUrl: item?.thumbnailUrl ?? "",
		properties: item?.properties ?? {},
	};
}

export function catalogueItemToFormValues(item: CatalogueItemDetails | CatalogueItemSearchResult) {
	return {
		name: item.name,
		type: inventoryTypeForCatalogueKind(item.kind),
		category: item.category,
		rarity: item.rarity,
		description: item.description,
		quantity: 1,
		weight: item.weight ?? "",
		estimatedValue: toGoldValue(item.costValue, item.costDenomination) ?? "",
		notes: "",
		thumbnailUrl: item.thumbnailUrl ?? "",
		properties: catalogueProperties(item),
	} satisfies ItemFormValues;
}

export function validateItemForm(values: ItemFormValues) {
	const errors: Partial<Record<keyof ItemFormValues, string>> = {};
	if (!values.name.trim()) errors.name = "Name is required.";
	if (!values.category.trim()) errors.category = "Category is required.";
	if (!isPositiveInteger(values.quantity))
		errors.quantity = "Enter a whole number greater than zero.";
	if (!isNonNegativeNumber(values.weight)) errors.weight = "Enter zero or a positive number.";
	if (!isNonNegativeNumber(values.estimatedValue)) {
		errors.estimatedValue = "Enter zero or a positive number.";
	}
	return errors;
}

export function toCharacterItemRequest(
	values: ItemFormValues,
	mode: "create" | "edit",
	catalogueItemId: string | null,
): CreateCharacterItemRequest | UpdateCharacterItemRequest {
	const fields = {
		name: values.name.trim(),
		type: values.type,
		category: values.category.trim(),
		rarity: values.rarity,
		description: nullableText(values.description),
		quantity: Number(values.quantity),
		weight: nullableNumber(values.weight),
		estimatedValue: nullableNumber(values.estimatedValue),
		notes: nullableText(values.notes),
		thumbnailUrl: nullableText(values.thumbnailUrl),
		properties: values.properties,
	};
	return mode === "create" ? { ...fields, catalogueItemId } : fields;
}

function catalogueProperties(item: CatalogueItemDetails | CatalogueItemSearchResult): JsonObject {
	return {
		catalogueKind: item.kind,
		isMagical: item.isMagical,
		requiresAttunement: item.requiresAttunement,
		tags: item.properties,
		cost: { value: item.costValue, denomination: item.costDenomination },
		stats: item.stats,
	};
}

function toGoldValue(value: number | null, denomination: string | null) {
	if (value === null || denomination === null) return null;
	const multiplier: Record<string, number> = {
		cp: 0.01,
		copper: 0.01,
		sp: 0.1,
		silver: 0.1,
		gp: 1,
		gold: 1,
		pp: 10,
		platinum: 10,
	};
	const result = multiplier[denomination.trim().toLowerCase()];
	return result === undefined ? null : value * result;
}

function nullableText(value: string) {
	return value.trim() || null;
}

function nullableNumber(value: number | string) {
	return value === "" ? null : Number(value);
}

function isPositiveInteger(value: number | string) {
	return value !== "" && Number.isInteger(Number(value)) && Number(value) > 0;
}

function isNonNegativeNumber(value: number | string) {
	return value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0);
}
