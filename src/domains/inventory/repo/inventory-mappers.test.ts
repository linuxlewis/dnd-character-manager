import { describe, expect, it } from "vitest";
import {
	toCharacterTreasury,
	toInventoryScope,
	toInventoryTreasury,
	zeroCharacterTreasury,
} from "./inventory-mappers.js";

const characterId = "00000000-0000-4000-8000-000000000001";
const scopeId = "00000000-0000-4000-8000-000000000002";

const treasuryRow = {
	inventoryScopeId: scopeId,
	copper: 5,
	silver: 2,
	gold: 3,
	platinum: 1,
	createdAt: new Date("2026-08-29T12:00:00.000Z"),
	updatedAt: new Date("2026-08-29T12:00:00.000Z"),
};

describe("inventory row mappers", () => {
	it("parses scope and treasury rows and normalizes database dates", () => {
		expect(
			toInventoryScope({
				id: scopeId,
				characterId,
				createdAt: new Date("2026-08-29T12:00:00.000Z"),
				updatedAt: "2026-08-29T12:01:00.000Z",
			}),
		).toEqual({
			id: scopeId,
			characterId,
			partyId: null,
			createdAt: "2026-08-29T12:00:00.000Z",
			updatedAt: "2026-08-29T12:01:00.000Z",
		});
		expect(toInventoryTreasury(treasuryRow)).toMatchObject({
			inventoryScopeId: scopeId,
			copper: 5,
			createdAt: "2026-08-29T12:00:00.000Z",
		});
	});

	it("builds parsed public treasury values without exposing the scope ID", () => {
		expect(toCharacterTreasury(characterId, treasuryRow)).toEqual({
			characterId,
			balances: { cp: 5, sp: 2, gp: 3, pp: 1 },
			totalValue: { copper: 1_325, gp: 13.25 },
		});
		expect(zeroCharacterTreasury(characterId)).toEqual({
			characterId,
			balances: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: { copper: 0, gp: 0 },
		});
	});

	it("rejects invalid rows and IDs before returning values", () => {
		expect(() => toInventoryTreasury({ ...treasuryRow, copper: -1 })).toThrow();
		expect(() => toInventoryScope({ ...treasuryRow, id: scopeId })).toThrow();
		expect(() => toCharacterTreasury("not-a-uuid", treasuryRow)).toThrow();
	});
});
