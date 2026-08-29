import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { InventoryItemSchema } from "../types/index.js";
import { CharacterInventory } from "./character-inventory.js";

const characterId = "00000000-0000-4000-8000-000000000041";

describe("CharacterInventory", () => {
	it("renders an explicit loading state before the list arrives", () => {
		const html = renderInventory(new QueryClient());
		expect(html).toContain("Loading personal inventory");
	});

	it("renders the empty state and add action", () => {
		const client = new QueryClient();
		setList(client, [], 0);
		const html = renderInventory(client);
		expect(html).toContain("No personal items yet");
		expect(html).toContain("Add your first item");
	});

	it("renders cards and filter counts from the scoped list", () => {
		const equipment = makeItem({
			id: "00000000-0000-4000-8000-000000000042",
			name: "Longsword",
			type: "equipment",
			rarity: "rare",
			quantity: 2,
		});
		const potion = makeItem({
			id: "00000000-0000-4000-8000-000000000043",
			name: "Healing Potion",
			type: "potion",
		});
		const client = new QueryClient();
		setList(client, [equipment, potion], 2);
		const html = renderInventory(client);
		expect(html).toContain("Personal inventory");
		expect(html).toContain("Longsword");
		expect(html).toContain("Healing Potion");
		expect(html).toContain("Rare");
		expect(html).toContain("x2");
		expect(html).toContain("Equipment");
		expect(html).toContain("Potion");
	});
});

function renderInventory(client: QueryClient) {
	return renderToString(
		<MantineProvider>
			<QueryClientProvider client={client}>
				<CharacterInventory characterId={characterId} />
			</QueryClientProvider>
		</MantineProvider>,
	);
}

function setList(client: QueryClient, items: ReturnType<typeof makeItem>[], total: number) {
	client.setQueryData(
		apiQueryKeys.listCharacterItems({ characterId }, { search: undefined, type: undefined }),
		{ items, total },
	);
	client.setQueryData(apiQueryKeys.listCharacterItems({ characterId }, { search: undefined }), {
		items,
		total,
	});
}

function makeItem(overrides: Record<string, unknown>) {
	return InventoryItemSchema.parse({
		id: "00000000-0000-4000-8000-000000000040",
		inventoryScopeId: "00000000-0000-4000-8000-000000000049",
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
