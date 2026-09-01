import { describe, expect, it } from "vitest";
import {
	CharacterInventoryScopeOwnerSchema,
	InventoryScopeOwnerSchema,
	InventoryScopeSchema,
	PartyInventoryScopeOwnerSchema,
} from "./ids.js";

const characterId = "00000000-0000-4000-8000-000000000001";
const partyId = "00000000-0000-4000-8000-000000000002";

describe("inventory ownership schemas", () => {
	it("accepts a fully valid character-owned inventory scope", () => {
		const scope = {
			id: "00000000-0000-4000-8000-000000000003",
			characterId,
			partyId: null,
			createdAt: "2026-08-29T12:00:00.000Z",
			updatedAt: "2026-08-29T12:00:00.000Z",
		};

		expect(InventoryScopeSchema.parse(scope)).toEqual(scope);
	});

	it("accepts character and party owners as explicit foreign-key shapes", () => {
		const characterOwner = { characterId, partyId: null };
		const partyOwner = { characterId: null, partyId };

		expect(CharacterInventoryScopeOwnerSchema.parse(characterOwner)).toEqual(characterOwner);
		expect(PartyInventoryScopeOwnerSchema.parse(partyOwner)).toEqual(partyOwner);
		expect(InventoryScopeOwnerSchema.parse(partyOwner)).toEqual(partyOwner);
	});

	it("rejects a scope with zero or multiple owners", () => {
		const base = {
			id: "00000000-0000-4000-8000-000000000003",
			createdAt: "2026-08-29T12:00:00.000Z",
			updatedAt: "2026-08-29T12:00:00.000Z",
		};

		expect(() =>
			InventoryScopeSchema.parse({ ...base, characterId: null, partyId: null }),
		).toThrow();
		expect(() => InventoryScopeSchema.parse({ ...base, characterId, partyId })).toThrow();
	});

	it("rejects non-UUID scope and owner IDs", () => {
		expect(() =>
			InventoryScopeSchema.parse({
				id: "scope-1",
				characterId,
				partyId: null,
				createdAt: "2026-08-29T12:00:00.000Z",
				updatedAt: "2026-08-29T12:00:00.000Z",
			}),
		).toThrow();
		expect(() =>
			CharacterInventoryScopeOwnerSchema.parse({ characterId: "character-1", partyId: null }),
		).toThrow();
	});
});
