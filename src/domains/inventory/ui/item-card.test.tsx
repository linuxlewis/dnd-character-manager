import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InventoryItemSchema } from "../types/index.js";
import { ItemCard } from "./item-card.js";

describe("ItemCard", () => {
	it("renders the thumbnail fallback, rarity, quantity, type, values, and key stats", () => {
		const html = renderToString(
			<MantineProvider>
				<ItemCard item={item()} onClick={() => undefined} />
			</MantineProvider>,
		).replaceAll("<!-- -->", "");

		expect(html).toContain('aria-label="View Moonblade"');
		expect(html).toContain('aria-label="Equipment icon"');
		expect(html).toContain("Rare");
		expect(html).toContain("x2");
		expect(html).toContain("Equipment");
		expect(html).toContain("Weapons");
		expect(html).toContain("3 lb");
		expect(html).toContain("15 GP");
		expect(html).toContain("Damage:");
		expect(html).toContain("1d8 slashing");
	});
});

function item() {
	return InventoryItemSchema.parse({
		id: "00000000-0000-4000-8000-000000000040",
		inventoryScopeId: "00000000-0000-4000-8000-000000000049",
		name: "Moonblade",
		type: "equipment",
		category: "Weapons",
		rarity: "rare",
		description: "A luminous magical blade.",
		quantity: 2,
		weight: 3,
		estimatedValue: 15,
		notes: null,
		thumbnailUrl: null,
		properties: { stats: { damage: "1d8 slashing" } },
		isEquipped: false,
		statModifiers: null,
		statOverrides: null,
		catalogueItemId: null,
		catalogueSourceKey: null,
		catalogueRulesVersion: null,
		createdAt: "2026-08-29T00:00:00.000Z",
		updatedAt: "2026-08-29T00:00:00.000Z",
	});
}
