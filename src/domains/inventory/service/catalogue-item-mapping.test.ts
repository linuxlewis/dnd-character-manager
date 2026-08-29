import { describe, expect, it } from "vitest";
import type { CatalogueItemSnapshot } from "./catalogue-item-client.js";
import { mapCatalogueItemToInventoryItem } from "./catalogue-item-mapping.js";

const baseItem: CatalogueItemSnapshot = {
	id: "00000000-0000-4000-8000-000000000010",
	sourceKey: "phbwepLongsword",
	rulesVersion: "2024",
	name: "Longsword",
	kind: "weapon",
	category: "Weapons",
	description: "A versatile martial weapon.",
	isMagical: false,
	rarity: null,
	requiresAttunement: false,
	costValue: 15,
	costDenomination: "gp",
	weight: 3,
	thumbnailUrl: "https://example.test/longsword.webp",
	properties: ["versatile"],
	stats: { damage: { oneHanded: "1d8" } },
};

describe("mapCatalogueItemToInventoryItem", () => {
	it.each([
		["weapon", "equipment"],
		["armor", "equipment"],
		["magic-item", "equipment"],
		["tool", "equipment"],
		["adventuring-gear", "misc"],
		["container", "misc"],
		["other", "misc"],
		["potion", "potion"],
		["scroll", "scroll"],
		["consumable", "consumable"],
	] as const)("maps %s to %s", (kind, type) => {
		const mapped = mapCatalogueItemToInventoryItem({ ...baseItem, kind });
		expect(mapped.type).toBe(type);
	});

	it("normalizes catalogue fields and converts supported costs to GP", () => {
		const mapped = mapCatalogueItemToInventoryItem({
			...baseItem,
			kind: "magic-item",
			description: "   ",
			costValue: 25,
			costDenomination: "sp",
			rarity: "rare",
		});

		expect(mapped).toMatchObject({
			name: "Longsword",
			type: "equipment",
			category: "Weapons",
			rarity: "rare",
			description: null,
			estimatedValue: 2.5,
			catalogueItemId: baseItem.id,
			catalogueSourceKey: "phbwepLongsword",
			catalogueRulesVersion: "2024",
		});
		expect(mapped.properties).toEqual({
			catalogueKind: "magic-item",
			isMagical: false,
			requiresAttunement: false,
			tags: ["versatile"],
			cost: { value: 25, denomination: "sp" },
			stats: { damage: { oneHanded: "1d8" } },
		});
	});
});
