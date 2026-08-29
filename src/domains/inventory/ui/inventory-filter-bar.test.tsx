import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InventoryItemSchema } from "../types/index.js";
import { InventoryFilterBar } from "./inventory-filter-bar.js";

const items = [
	makeItem({ id: "00000000-0000-4000-8000-000000000031", type: "equipment" }),
	makeItem({ id: "00000000-0000-4000-8000-000000000032", type: "potion" }),
	makeItem({ id: "00000000-0000-4000-8000-000000000033", type: "equipment" }),
];

describe("InventoryFilterBar", () => {
	it("renders every literal type filter with visible counts", () => {
		const html = renderToString(
			<MantineProvider>
				<InventoryFilterBar
					activeType="all"
					countItems={items}
					onChange={vi.fn()}
					totalCount={items.length}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("All");
		expect(html).toContain("Equipment");
		expect(html).toContain("Potion");
		expect(html).toContain("2");
		expect(html).toContain("1");
		expect(html).toContain("Scroll");
	});
});

function makeItem(overrides: Record<string, unknown>) {
	return InventoryItemSchema.parse({
		id: "00000000-0000-4000-8000-000000000030",
		inventoryScopeId: "00000000-0000-4000-8000-000000000039",
		name: "Test item",
		type: "misc",
		category: "Gear",
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
