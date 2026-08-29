import { describe, expect, it } from "vitest";
import { toInventoryHistoryEntry, toInventoryHistoryInsert } from "./inventory-history-mappers.js";

const scopeId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const entryId = "00000000-0000-4000-8000-000000000003";

describe("inventory history mappers", () => {
	it("parses database dates and JSON details before returning history", () => {
		expect(
			toInventoryHistoryEntry({
				id: entryId,
				inventoryScopeId: scopeId,
				action: "item_added",
				entityType: "item",
				entityId: itemId,
				entityName: "Rope",
				details: { quantity: 1 },
				createdAt: new Date("2026-08-29T12:00:00.000Z"),
			}),
		).toEqual({
			id: entryId,
			inventoryScopeId: scopeId,
			action: "item_added",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			details: { quantity: 1 },
			createdAt: "2026-08-29T12:00:00.000Z",
		});
	});

	it("normalizes and validates history inserts", () => {
		expect(
			toInventoryHistoryInsert(scopeId, {
				action: "currency_updated",
				entityType: "currency",
				details: { gp: 2 },
			}),
		).toMatchObject({
			inventoryScopeId: scopeId,
			entityId: null,
			entityName: null,
			details: { gp: 2 },
		});
	});

	it("rejects invalid persisted JSON and action boundaries", () => {
		const row = {
			id: entryId,
			inventoryScopeId: scopeId,
			action: "item_added",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			details: { quantity: 1 },
			createdAt: new Date("2026-08-29T12:00:00.000Z"),
		};
		expect(() => toInventoryHistoryEntry({ ...row, action: "invalid" })).toThrow();
		expect(() => toInventoryHistoryEntry({ ...row, details: ["not an object"] })).toThrow();
		expect(() => toInventoryHistoryInsert(scopeId, { ...row, id: undefined })).toThrow();
	});
});
