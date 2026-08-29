import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { InventoryItemSchema } from "../types/index.js";
import { reconcileItem } from "./inventory-cache.js";

const characterId = "00000000-0000-4000-8000-000000000041";

describe("inventory cache reconciliation", () => {
	it("writes the mutation response to the item detail cache", () => {
		const queryClient = new QueryClient();
		const item = InventoryItemSchema.parse({
			id: "00000000-0000-4000-8000-000000000042",
			inventoryScopeId: "00000000-0000-4000-8000-000000000049",
			name: "Equipped blade",
			type: "equipment",
			category: "Weapons",
			rarity: null,
			description: null,
			quantity: 1,
			weight: null,
			estimatedValue: null,
			notes: null,
			thumbnailUrl: null,
			properties: {},
			isEquipped: true,
			statModifiers: null,
			statOverrides: null,
			catalogueItemId: null,
			catalogueSourceKey: null,
			catalogueRulesVersion: null,
			createdAt: "2026-08-29T00:00:00.000Z",
			updatedAt: "2026-08-29T00:00:00.000Z",
		});

		reconcileItem(queryClient, characterId, item);

		expect(
			queryClient.getQueryData(
				apiQueryKeys.getCharacterItemDetails({ characterId, itemId: item.id }),
			),
		).toEqual({ item });
	});
});
