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

	it("formats a description-only edit instead of a malformed entry", () => {
		const snapshot = {
			id: "00000000-0000-4000-8000-000000000002",
			name: "Writ of commerce",
			type: "consumable",
			category: "Consumables",
			rarity: "legendary",
			quantity: 1,
			weight: null,
			estimatedValue: 10000,
			isEquipped: false,
		};
		const entry = {
			id: "00000000-0000-4000-8000-000000000001",
			entityId: snapshot.id,
			entityName: snapshot.name,
			entityType: "item",
			action: "item_updated",
			actorUserId: null,
			createdAt: "2026-08-30T12:00:00.000Z",
			details: {
				version: 1,
				before: snapshot,
				after: snapshot,
				changedFields: ["description"],
			},
		} as CharacterHistoryEntry;

		expect(formatItemHistoryEntry(entry)).toMatchObject({
			detail: "Description updated",
			summary: "Updated Writ of commerce",
			tone: "neutral",
		});
	});
});
