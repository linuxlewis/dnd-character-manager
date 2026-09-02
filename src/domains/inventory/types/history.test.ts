import { describe, expect, it } from "vitest";
import {
	InventoryHistoryEntryInputSchema,
	InventoryHistoryEntrySchema,
	InventoryHistoryPageRequestSchema,
	InventoryHistoryPageSchema,
} from "./history.js";

const scopeId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const entryId = "00000000-0000-4000-8000-000000000003";

describe("inventory history schemas", () => {
	it("defaults append input fields and parses persisted entries", () => {
		expect(
			InventoryHistoryEntryInputSchema.parse({
				action: "currency_updated",
				entityType: "currency",
			}),
		).toEqual({
			action: "currency_updated",
			entityType: "currency",
			entityId: null,
			entityName: null,
			details: {},
		});
		expect(
			InventoryHistoryEntrySchema.parse({
				id: entryId,
				inventoryScopeId: scopeId,
				action: "item_added",
				entityType: "item",
				entityId: itemId,
				entityName: "Rope",
				details: { quantity: 1 },
				createdAt: "2026-08-29T12:00:00.000Z",
			}),
		).toHaveProperty("entityId", itemId);
	});

	it("validates bounded paging and strict JSON details", () => {
		expect(InventoryHistoryPageRequestSchema.parse({})).toEqual({ limit: 50, offset: 0 });
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
