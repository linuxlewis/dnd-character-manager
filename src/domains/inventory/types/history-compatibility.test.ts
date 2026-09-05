import { describe, expect, it } from "vitest";
import { ListCharacterHistoryResponseSchema } from "./history.js";
import { decodeCharacterHistoryPage } from "./history-compatibility.js";

const itemId = "00000000-0000-4000-8000-000000000002";
const validEntry = {
	id: "00000000-0000-4000-8000-000000000003",
	entityId: itemId,
	entityName: "Rope",
	entityType: "item" as const,
	action: "item_added" as const,
	actorUserId: null,
	createdAt: "2026-08-30T12:00:00.000Z",
	details: {
		version: 1 as const,
		item: {
			id: itemId,
			name: "Rope",
			type: "misc" as const,
			category: "Adventuring Gear",
			rarity: null,
			quantity: 1,
			weight: 10,
			estimatedValue: 1,
			isEquipped: false,
		},
	},
};

describe("character history compatibility decoder", () => {
	it("keeps valid rows and preserves recoverable metadata for malformed rows", () => {
		const malformedEntry = {
			id: "00000000-0000-4000-8000-000000000005",
			entityType: "item",
			action: "item_added",
			createdAt: "2026-08-29T12:00:00.000Z",
			details: { version: 2, item: {} },
		};
		const pageInput = {
			entries: [validEntry, malformedEntry],
			total: 2,
			limit: 20,
			offset: 20,
			hasMore: false,
		};

		const page = decodeCharacterHistoryPage(pageInput);

		expect(page.entries[0]).toEqual(validEntry);
		expect(page.entries[1]).toMatchObject({
			id: malformedEntry.id,
			createdAt: malformedEntry.createdAt,
			entityType: "item",
			action: "item_added",
			details: { __malformedHistoryEntry: true },
		});
		expect(() => ListCharacterHistoryResponseSchema.parse(pageInput)).toThrow();
	});

	it("uses a stable fallback identity when a malformed row has no id", () => {
		const page = decodeCharacterHistoryPage({
			entries: [{ createdAt: "not-a-date", details: null }],
			total: 1,
			limit: 20,
			offset: 40,
			hasMore: false,
		});

		expect(page.entries[0]).toMatchObject({
			id: "malformed-history-40-0",
			createdAt: "not-a-date",
			details: { __malformedHistoryEntry: true },
		});
	});
});
