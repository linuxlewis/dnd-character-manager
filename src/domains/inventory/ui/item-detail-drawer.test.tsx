import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InventoryItemSchema } from "../types/index.js";
import { ItemDetailDrawer } from "./item-detail-drawer.js";

describe("ItemDetailDrawer", () => {
	it("renders snapshot provenance, equipped state, stats, and mutation controls", () => {
		const html = renderToString(
			<MantineProvider>
				<ItemDetailDrawer
					error={null}
					item={item()}
					onClose={vi.fn()}
					onDelete={vi.fn()}
					onEdit={vi.fn()}
					onEquip={vi.fn()}
					onUnequip={vi.fn()}
					opened
					pending={false}
					withinPortal={false}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Catalogue provenance");
		expect(readableHtml).toContain("Local SRD snapshot");
		expect(readableHtml).toContain("Rules 2024");
		expect(readableHtml).toContain("Source phbwepMoonblade");
		expect(readableHtml).toContain("Equipped");
		expect(readableHtml).toContain("Damage");
		expect(readableHtml).toContain("1d8 slashing");
		expect(readableHtml).toContain("Edit");
		expect(readableHtml).toContain("Unequip");
		expect(readableHtml).toContain("Delete");
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
		quantity: 1,
		weight: 3,
		estimatedValue: 15,
		notes: null,
		thumbnailUrl: null,
		properties: { stats: { damage: "1d8 slashing" } },
		isEquipped: true,
		statModifiers: null,
		statOverrides: null,
		catalogueItemId: "00000000-0000-4000-8000-000000000052",
		catalogueSourceKey: "phbwepMoonblade",
		catalogueRulesVersion: "2024",
		createdAt: "2026-08-29T00:00:00.000Z",
		updatedAt: "2026-08-29T00:00:00.000Z",
	});
}
