import { describe, expect, it } from "vitest";
import { toInventoryHistoryEntry, toInventoryHistoryInsert } from "./inventory-history-mappers.js";

const scopeId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const entryId = "00000000-0000-4000-8000-000000000003";
const actorUserId = "00000000-0000-4000-8000-000000000004";

const item = {
	id: itemId,
	inventoryScopeId: scopeId,
	name: "Rope",
	type: "misc",
	category: "Adventuring Gear",
	rarity: null,
	description: "A hempen rope",
	quantity: 1,
	weight: 10,
	estimatedValue: 1,
	notes: null,
	thumbnailUrl: null,
	catalogueItemId: null,
	catalogueSourceKey: null,
	catalogueRulesVersion: null,
	properties: { material: "hemp" },
	isEquipped: false,
	statModifiers: null,
	statOverrides: null,
	createdAt: "2026-08-29T11:00:00.000Z",
	updatedAt: "2026-08-29T12:00:00.000Z",
};

describe("inventory history mappers", () => {
	it("normalizes existing A6 item rows and database dates", () => {
		expect(
			toInventoryHistoryEntry({
				id: entryId,
				inventoryScopeId: scopeId,
				action: "item_added",
				entityType: "item",
				entityId: itemId,
				entityName: "Rope",
				actorUserId: null,
				details: { before: null, after: null, item },
				createdAt: new Date("2026-08-29T12:00:00.000Z"),
			}),
		).toEqual({
			id: entryId,
			inventoryScopeId: scopeId,
			action: "item_added",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			actorUserId: null,
			details: {
				version: 1,
				item: {
					id: itemId,
					name: "Rope",
					type: "misc",
					category: "Adventuring Gear",
					rarity: null,
					quantity: 1,
					weight: 10,
					estimatedValue: 1,
					isEquipped: false,
				},
			},
			createdAt: "2026-08-29T12:00:00.000Z",
		});
	});

	it("derives changed fields when normalizing an A6 update row", () => {
		const entry = toInventoryHistoryEntry({
			id: entryId,
			inventoryScopeId: scopeId,
			action: "item_updated",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			actorUserId,
			details: { before: item, after: { ...item, quantity: 2 }, item: null },
			createdAt: "2026-08-29T12:00:00.000Z",
		});
		expect(entry.actorUserId).toBe(actorUserId);
		expect(entry.details).toMatchObject({ version: 1, changedFields: ["quantity"] });
	});

	it("retains a notes changed marker when long note content is redacted", () => {
		const beforeNotes = "a".repeat(501);
		const afterNotes = "b".repeat(501);
		const entry = toInventoryHistoryEntry({
			id: entryId,
			inventoryScopeId: scopeId,
			action: "item_updated",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			actorUserId: null,
			details: {
				before: { ...item, notes: beforeNotes },
				after: { ...item, notes: afterNotes },
				item: null,
			},
			createdAt: "2026-08-29T12:00:00.000Z",
		});

		expect(entry.details).toMatchObject({
			version: 1,
			changedFields: ["notes"],
			before: expect.not.objectContaining({ notes: expect.anything() }),
			after: expect.not.objectContaining({ notes: expect.anything() }),
		});
	});

	it("reads legacy currency changes rows", () => {
		expect(
			toInventoryHistoryEntry({
				id: entryId,
				inventoryScopeId: scopeId,
				action: "currency_updated",
				entityType: "currency",
				entityId: null,
				entityName: null,
				actorUserId: null,
				details: {
					changes: {
						old: { cp: 0, sp: 0, gp: 1, pp: 0 },
						new: { cp: 0, sp: 0, gp: 2, pp: 0 },
					},
				},
				createdAt: "2026-08-29T12:00:00.000Z",
			}),
		).toMatchObject({
			action: "currency_updated",
			entityType: "currency",
			details: {
				changes: {
					old: { gp: 1 },
					new: { gp: 2 },
				},
				note: null,
			},
		});
	});

	it("writes versioned details and defaults a missing actor to null", () => {
		expect(
			toInventoryHistoryInsert(scopeId, {
				action: "item_removed",
				entityType: "item",
				entityId: itemId,
				entityName: "Rope",
				details: { item },
			}),
		).toEqual({
			inventoryScopeId: scopeId,
			action: "item_removed",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			actorUserId: null,
			details: {
				version: 1,
				item: {
					id: itemId,
					name: "Rope",
					type: "misc",
					category: "Adventuring Gear",
					rarity: null,
					quantity: 1,
					weight: 10,
					estimatedValue: 1,
					isEquipped: false,
				},
			},
		});
	});

	it("rejects invalid persisted details and action boundaries", () => {
		const row = {
			id: entryId,
			inventoryScopeId: scopeId,
			action: "item_added",
			entityType: "item",
			entityId: itemId,
			entityName: "Rope",
			actorUserId: null,
			details: { item },
			createdAt: new Date("2026-08-29T12:00:00.000Z"),
		};
		expect(() => toInventoryHistoryEntry({ ...row, action: "invalid" })).toThrow();
		expect(() => toInventoryHistoryEntry({ ...row, details: ["not an object"] })).toThrow();
		expect(() => toInventoryHistoryInsert(scopeId, { ...row, id: undefined })).toThrow();
	});
});
