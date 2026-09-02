import { describe, expect, it } from "vitest";
import {
	InventoryHistoryCurrencyAddDetailsSchema,
	InventoryHistoryEntryInputSchema,
	InventoryHistoryEntrySchema,
	InventoryHistoryItemAddedDetailsSchema,
	InventoryHistoryItemUpdatedDetailsSchema,
	InventoryHistoryPageRequestSchema,
	InventoryHistoryPageSchema,
} from "./history.js";

const scopeId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const actorUserId = "00000000-0000-4000-8000-000000000004";
const entryId = "00000000-0000-4000-8000-000000000003";

const item = {
	id: itemId,
	name: "Rope",
	type: "misc" as const,
	category: "Adventuring Gear",
	rarity: null,
	quantity: 1,
	weight: 10,
	estimatedValue: 1,
	isEquipped: false,
};

describe("inventory history schemas", () => {
	it("parses versioned action-specific details and actor metadata", () => {
		const details = InventoryHistoryItemAddedDetailsSchema.parse({ version: 1, item });
		expect(
			InventoryHistoryEntryInputSchema.parse({
				action: "item_added",
				entityType: "item",
				actorUserId,
				details,
			}),
		).toMatchObject({
			entityId: null,
			entityName: null,
			actorUserId,
			details,
		});
		expect(
			InventoryHistoryEntrySchema.parse({
				id: entryId,
				inventoryScopeId: scopeId,
				action: "item_added",
				entityType: "item",
				entityId: itemId,
				entityName: "Rope",
				actorUserId: null,
				details,
				createdAt: "2026-08-29T12:00:00.000Z",
			}),
		).toHaveProperty("actorUserId", null);
	});

	it("validates currency request variants and action/entity consistency", () => {
		expect(
			InventoryHistoryCurrencyAddDetailsSchema.parse({
				version: 1,
				operation: "add",
				previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
				next: { cp: 0, sp: 0, gp: 2, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 2, pp: 0 },
				requested: { delta: { cp: 0, sp: 0, gp: 2, pp: 0 } },
				note: null,
			}),
		).toBeDefined();
		expect(
			InventoryHistoryItemUpdatedDetailsSchema.parse({
				version: 1,
				before: item,
				after: { ...item, quantity: 2 },
				changedFields: ["quantity"],
			}),
		).toBeDefined();
		expect(() =>
			InventoryHistoryEntryInputSchema.parse({
				action: "item_added",
				entityType: "currency",
				details: { version: 1, item },
			}),
		).toThrow();
	});

	it("validates bounded paging and strict page shapes", () => {
		expect(InventoryHistoryPageRequestSchema.parse({})).toEqual({ limit: 50, offset: 0 });
		expect(
			InventoryHistoryPageRequestSchema.parse({
				limit: 20,
				offset: 5,
				action: "item_updated",
				entityType: "item",
			}),
		).toEqual({ limit: 20, offset: 5, action: "item_updated", entityType: "item" });
		expect(
			InventoryHistoryPageSchema.parse({
				entries: [],
				total: 0,
				limit: 20,
				offset: 0,
				hasMore: false,
			}),
		).toBeDefined();
		expect(() => InventoryHistoryPageRequestSchema.parse({ limit: 101 })).toThrow();
		expect(() =>
			InventoryHistoryEntryInputSchema.parse({
				action: "item_added",
				entityType: "item",
				details: ["not an object"],
			}),
		).toThrow();
	});
});
