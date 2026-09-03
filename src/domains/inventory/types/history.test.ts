import { describe, expect, it } from "vitest";
import {
	CharacterHistoryEntrySchema,
	InventoryHistoryCurrencyAddDetailsSchema,
	InventoryHistoryEntryInputSchema,
	InventoryHistoryEntrySchema,
	InventoryHistoryItemAddedDetailsSchema,
	InventoryHistoryItemUpdatedDetailsSchema,
	InventoryHistoryPageRequestSchema,
	InventoryHistoryPageSchema,
	ListCharacterHistoryRequestSchema,
	ListCharacterHistoryResponseSchema,
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
				entityId: itemId,
				entityName: "Rope",
				actorUserId,
				details,
			}),
		).toMatchObject({
			entityId: itemId,
			entityName: "Rope",
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

	it("enforces history row metadata and snapshot identity invariants", () => {
		const itemDetails = { version: 1, item };
		expect(() =>
			InventoryHistoryEntryInputSchema.parse({
				action: "item_added",
				entityType: "item",
				details: itemDetails,
			}),
		).toThrow();
		expect(() =>
			InventoryHistoryEntryInputSchema.parse({
				action: "item_added",
				entityType: "item",
				entityId: itemId,
				details: itemDetails,
			}),
		).toThrow();
		expect(() =>
			InventoryHistoryEntryInputSchema.parse({
				action: "currency_updated",
				entityType: "currency",
				entityId: itemId,
				entityName: "Coins",
				details: {
					version: 1,
					operation: "add",
					previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
					next: { cp: 0, sp: 0, gp: 1, pp: 0 },
					delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
					requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
					note: null,
				},
			}),
		).toThrow();
		expect(() =>
			InventoryHistoryEntryInputSchema.parse({
				action: "item_updated",
				entityType: "item",
				entityId: itemId,
				entityName: "Rope",
				details: {
					version: 1,
					before: item,
					after: { ...item, id: entryId },
					changedFields: ["quantity"],
				},
			}),
		).toThrow();
	});

	it("validates bounded paging and strict page shapes", () => {
		expect(InventoryHistoryPageRequestSchema.parse({})).toEqual({ limit: 20, offset: 0 });
		expect(
			InventoryHistoryPageRequestSchema.parse({
				limit: 20,
				offset: 5,
				action: "item_updated",
				entityType: "item",
			}),
		).toEqual({ limit: 20, offset: 5, action: "item_updated", entityType: "item" });
		expect(() => InventoryHistoryPageRequestSchema.parse({ action: "not_an_action" })).toThrow();
		expect(() =>
			InventoryHistoryPageRequestSchema.parse({ entityType: "not_an_entity" }),
		).toThrow();
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

	it("parses character history query defaults and serialized pagination", () => {
		expect(ListCharacterHistoryRequestSchema.parse({})).toEqual({ limit: 20, offset: 0 });
		expect(
			ListCharacterHistoryRequestSchema.parse({
				limit: "2",
				offset: "4",
				action: "currency_updated",
				entityType: "currency",
			}),
		).toEqual({ limit: 2, offset: 4, action: "currency_updated", entityType: "currency" });
		expect(() => ListCharacterHistoryRequestSchema.parse({ limit: "0" })).toThrow();
		expect(() => ListCharacterHistoryRequestSchema.parse({ limit: "101" })).toThrow();
		expect(() => ListCharacterHistoryRequestSchema.parse({ offset: "-1" })).toThrow();
		expect(() => ListCharacterHistoryRequestSchema.parse({ action: "invalid" })).toThrow();
		expect(() => ListCharacterHistoryRequestSchema.parse({ entityType: "invalid" })).toThrow();
	});

	it("defines a public page without the internal scope identifier", () => {
		const entry = {
			id: entryId,
			inventoryScopeId: scopeId,
			action: "currency_updated" as const,
			entityType: "currency" as const,
			entityId: null,
			entityName: null,
			actorUserId: null,
			details: {
				version: 1 as const,
				operation: "add" as const,
				previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
				next: { cp: 0, sp: 0, gp: 1, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
				requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
				note: null,
			},
			createdAt: "2026-08-29T12:00:00.000Z",
		};
		const { inventoryScopeId: _inventoryScopeId, ...publicEntryInput } = entry;
		const publicEntry = CharacterHistoryEntrySchema.parse(publicEntryInput);
		expect(publicEntry).not.toHaveProperty("inventoryScopeId");
		expect(() =>
			ListCharacterHistoryResponseSchema.parse({
				entries: [entry],
				total: 1,
				limit: 20,
				offset: 0,
				hasMore: false,
			}),
		).toThrow();
	});
});
