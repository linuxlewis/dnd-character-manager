import { describe, expect, it } from "vitest";
import type { CharacterHistoryEntry } from "../types/index.js";
import { formatItemHistoryEntry } from "./activity-format-item.js";

describe("item activity formatter", () => {
	it("uses the item type seal and deleted snapshot details", () => {
		const entry = {
			id: "00000000-0000-4000-8000-000000000001",
			entityId: null,
			entityName: "Potion",
			entityType: "item",
			action: "item_removed",
			actorUserId: null,
			createdAt: "2026-08-30T12:00:00.000Z",
			details: {
				version: 1,
				item: {
					id: "00000000-0000-4000-8000-000000000002",
					name: "Potion",
					type: "potion",
					category: "Consumables",
					rarity: "rare",
					quantity: 1,
					weight: 0.5,
					estimatedValue: 150,
					isEquipped: false,
				},
			},
		} as CharacterHistoryEntry;

		expect(formatItemHistoryEntry(entry)).toMatchObject({
			detail: "Rare | 0.5 lb | 150 GP",
			itemType: "potion",
			summary: "Removed Potion",
			tone: "negative",
		});
	});
});
