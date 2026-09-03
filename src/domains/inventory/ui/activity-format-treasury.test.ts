import { describe, expect, it } from "vitest";
import type { CharacterHistoryEntry } from "../types/index.js";
import { formatCurrencyHistoryEntry } from "./activity-format-treasury.js";

describe("treasury activity formatter", () => {
	it("describes requested spend and authoritative making-change balance", () => {
		const entry = {
			id: "00000000-0000-4000-8000-000000000001",
			entityId: null,
			entityName: null,
			entityType: "currency",
			action: "currency_updated",
			actorUserId: null,
			createdAt: "2026-08-30T12:00:00.000Z",
			details: {
				version: 1,
				operation: "spend",
				previous: { cp: 0, sp: 0, gp: 0, pp: 2 },
				next: { cp: 0, sp: 0, gp: 5, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 5, pp: -2 },
				requested: { amount: { denomination: "gp", amount: 15 } },
				note: "Bought climbing gear",
			},
		} as CharacterHistoryEntry;

		expect(formatCurrencyHistoryEntry(entry)).toMatchObject({
			detail: "Balance: 2 PP -> 5 GP",
			note: "Bought climbing gear",
			summary: "Spent 15 GP",
		});
	});
});
