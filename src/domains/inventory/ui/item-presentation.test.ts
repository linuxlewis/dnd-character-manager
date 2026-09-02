import { FlaskConical, Package, ScrollText, Sparkles, Sword } from "lucide-react";
import { describe, expect, it } from "vitest";
import { InventoryItemSchema } from "../types/index.js";
import {
	getItemRarityLabel,
	getItemRarityStyle,
	getItemStatEntries,
	getItemTypeIcon,
	getItemTypeLabel,
	INVENTORY_ITEM_TYPES,
	ITEM_RARITY_STYLES,
} from "./item-presentation.js";

describe("item presentation", () => {
	it("keeps the approved icon mapping stable", () => {
		expect(getItemTypeIcon("equipment")).toBe(Sword);
		expect(getItemTypeIcon("potion")).toBe(FlaskConical);
		expect(getItemTypeIcon("scroll")).toBe(ScrollText);
		expect(getItemTypeIcon("consumable")).toBe(Sparkles);
		expect(getItemTypeIcon("misc")).toBe(Package);
		expect(INVENTORY_ITEM_TYPES).toEqual(["equipment", "potion", "scroll", "consumable", "misc"]);
	});

	it("labels item types and applies distinct rarity colors", () => {
		expect(getItemTypeLabel("equipment")).toBe("Equipment");
		expect(getItemRarityLabel("very_rare")).toBe("Very Rare");
		expect(getItemRarityLabel(null)).toBe("Unrated");
		expect(new Set(Object.values(ITEM_RARITY_STYLES).map((style) => style.color)).size).toBe(6);
		expect(getItemRarityStyle("legendary")).toEqual(ITEM_RARITY_STYLES.legendary);
		expect(getItemRarityStyle(null)).toEqual(ITEM_RARITY_STYLES.common);
	});

	it("summarizes normalized weapon and armor stats without internal codes", () => {
		const item = makeItem({
			properties: {
				stats: {
					baseItem: "longsword",
					itemType: "martialM",
					damage: {
						base: { number: 1, denomination: 8, types: ["slashing"] },
						versatile: { number: 1, denomination: 10, types: ["slashing"] },
					},
					armor: { value: 16, dex: 2 },
				},
			},
		});

		expect(getItemStatEntries(item)).toEqual([
			{ label: "Damage", value: "1d8 slashing (versatile 1d10)" },
			{ label: "AC", value: "16 + Dex (max 2)" },
		]);
		const renderedStats = JSON.stringify(getItemStatEntries(item));
		expect(renderedStats).not.toContain("martialM");
		expect(renderedStats).not.toContain("denomination");
	});

	it("keeps simple displayable stats while omitting opaque nested values", () => {
		const item = makeItem({
			properties: { stats: { range: "30 ft", charges: 3, internal: { code: "martialM" } } },
		});

		expect(getItemStatEntries(item)).toEqual([
			{ label: "Range", value: "30 ft" },
			{ label: "Charges", value: "3" },
		]);
	});
});

function makeItem(overrides: Record<string, unknown>) {
	return InventoryItemSchema.parse({
		id: "00000000-0000-4000-8000-000000000060",
		inventoryScopeId: "00000000-0000-4000-8000-000000000069",
		name: "Test item",
		type: "equipment",
		category: "Equipment",
		rarity: null,
		description: null,
		quantity: 1,
		weight: null,
		estimatedValue: null,
		notes: null,
		thumbnailUrl: null,
		properties: {},
		isEquipped: false,
		statModifiers: null,
		statOverrides: null,
		catalogueItemId: null,
		catalogueSourceKey: null,
		catalogueRulesVersion: null,
		createdAt: "2026-08-29T00:00:00.000Z",
		updatedAt: "2026-08-29T00:00:00.000Z",
		...overrides,
	});
}
