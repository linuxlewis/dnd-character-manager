import { describe, expect, it } from "vitest";
import type { CharacterHistoryEntry } from "../types/index.js";
import {
	appendActivityPage,
	dedupeActivityEntries,
	formatHistoryEntry,
	formatHistoryQuery,
	formatRelativeTime,
	groupActivityEntries,
} from "./activity-format.js";

const now = new Date("2026-08-30T12:00:00.000Z");

describe("personal activity formatters", () => {
	it("formats item snapshots, field edits, and equip wording", () => {
		const item = itemEntry("item_added", {
			version: 1,
			item: itemSnapshot({ rarity: "uncommon", quantity: 2, weight: 0.5, estimatedValue: 50 }),
		});
		const equipped = itemEntry("item_updated", {
			version: 1,
			before: itemSnapshot({ isEquipped: false }),
			after: itemSnapshot({ isEquipped: true }),
			changedFields: ["isEquipped"],
		});
		const updated = itemEntry("item_updated", {
			version: 1,
			before: itemSnapshot({ quantity: 1, weight: 3 }),
			after: itemSnapshot({ quantity: 2, weight: 4 }),
			changedFields: ["quantity", "weight", "notes"],
		});

		expect(formatHistoryEntry(item).summary).toBe("Added Test item");
		expect(formatHistoryEntry(item).detail).toBe("Uncommon | x2 | 0.5 lb | 50 GP");
		expect(formatHistoryEntry(equipped)).toMatchObject({
			detail: "Equipment | Gear",
			summary: "Equipped Test item",
			tone: "positive",
		});
		expect(formatHistoryEntry(updated).detail).toContain("Quantity 1 -> 2");
		expect(formatHistoryEntry(updated).detail).toContain("+1 more changes");
	});

	it("formats requested treasury actions with authoritative balances", () => {
		const add = currencyEntry({
			version: 1,
			operation: "add",
			previous: { cp: 0, sp: 0, gp: 10, pp: 0 },
			next: { cp: 0, sp: 5, gp: 12, pp: 0 },
			delta: { cp: 0, sp: 5, gp: 2, pp: 0 },
			requested: { delta: { cp: 0, sp: 5, gp: 2, pp: 0 } },
			note: "  Guild reward  ",
		});
		const spend = currencyEntry({
			version: 1,
			operation: "spend",
			previous: { cp: 0, sp: 0, gp: 0, pp: 2 },
			next: { cp: 0, sp: 0, gp: 5, pp: 0 },
			delta: { cp: 0, sp: 0, gp: 5, pp: -2 },
			requested: { amount: { denomination: "gp", amount: 15 } },
			note: "Bought climbing gear",
		});
		const converted = currencyEntry({
			version: 1,
			operation: "convert",
			previous: { cp: 0, sp: 0, gp: 0, pp: 1 },
			next: { cp: 0, sp: 0, gp: 10, pp: 0 },
			delta: { cp: 0, sp: 0, gp: 10, pp: -1 },
			requested: { from: "pp", to: "gp", amount: 1 },
			note: null,
		});

		expect(formatHistoryEntry(add)).toMatchObject({
			detail: "Balance: 10 GP -> 12 GP 5 SP",
			note: "Guild reward",
			summary: "Added 2 GP and 5 SP",
			valueTone: "positive",
		});
		expect(formatHistoryEntry(spend)).toMatchObject({
			detail: "Balance: 2 PP -> 5 GP",
			note: "Bought climbing gear",
			summary: "Spent 15 GP",
			valueTone: "negative",
		});
		expect(formatHistoryEntry(spend).accessibleDetail).toContain("platinum pieces");
		expect(formatHistoryEntry(converted).summary).toBe("Converted 1 PP to 10 GP");
	});

	it("keeps malformed rows visible as a safe fallback", () => {
		const malformed = itemEntry("item_added", { version: 1, item: {} });
		expect(formatHistoryEntry(malformed).summary).toBe("This activity entry cannot be displayed.");
	});

	it("groups local dates and removes duplicate page entries", () => {
		const today = itemEntry("item_added", { version: 1, item: itemSnapshot() }, "today");
		const yesterday = itemEntry("item_removed", { version: 1, item: itemSnapshot() }, "yesterday");
		const duplicateToday = itemEntry("item_added", { version: 1, item: itemSnapshot() }, "today");
		const older = itemEntry(
			"item_added",
			{ version: 1, item: itemSnapshot() },
			"older",
			"2026-08-28T12:00:00.000Z",
		);
		const entries = [today, yesterday, duplicateToday, older];
		const groups = groupActivityEntries(entries, now);

		expect(dedupeActivityEntries(entries)).toHaveLength(3);
		expect(appendActivityPage([today], [duplicateToday, older])).toHaveLength(2);
		expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", expect.any(String)]);
		expect(groups.map((group) => group.entries.length)).toEqual([1, 1, 1]);
	});

	it("formats relative timestamps and filtered generated query input", () => {
		expect(formatRelativeTime("2026-08-30T11:59:00.000Z", now)).toBe("1 min ago");
		expect(formatRelativeTime("2026-08-30T10:00:00.000Z", now)).toBe("2 hours ago");
		expect(formatHistoryQuery("items", 20, 20)).toEqual({
			entityType: "item",
			limit: 20,
			offset: 20,
		});
		expect(formatHistoryQuery("treasury", 0, 20)).toEqual({
			entityType: "currency",
			limit: 20,
			offset: 0,
		});
	});
});

function itemEntry(
	action: "item_added" | "item_removed" | "item_updated",
	details: unknown,
	suffix: string = action,
	createdAt = action === "item_removed" ? "2026-08-29T12:00:00.000Z" : "2026-08-30T12:00:00.000Z",
) {
	return {
		id: `00000000-0000-4000-8000-${suffix === "today" ? "000000000001" : suffix === "yesterday" ? "000000000002" : "000000000003"}`,
		entityId: null,
		entityName: "Test item",
		entityType: "item",
		action,
		actorUserId: null,
		createdAt,
		details,
	} as CharacterHistoryEntry;
}

function currencyEntry(details: unknown) {
	return {
		id: `currency-${Math.random()}`,
		entityId: null,
		entityName: null,
		entityType: "currency",
		action: "currency_updated",
		actorUserId: null,
		createdAt: "2026-08-30T12:00:00.000Z",
		details,
	} as CharacterHistoryEntry;
}

function itemSnapshot(overrides: Record<string, unknown> = {}) {
	return {
		id: "00000000-0000-4000-8000-000000000001",
		name: "Test item",
		type: "equipment",
		category: "Gear",
		rarity: null,
		quantity: 1,
		weight: null,
		estimatedValue: null,
		isEquipped: false,
		...overrides,
	};
}
