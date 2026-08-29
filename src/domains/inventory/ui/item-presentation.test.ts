import { FlaskConical, Package, ScrollText, Sparkles, Sword } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
	getItemRarityLabel,
	getItemRarityStyle,
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
});
