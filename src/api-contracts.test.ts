import { describe, expect, it } from "vitest";
import { apiRouteContracts } from "./api-contracts.js";

describe("apiRouteContracts", () => {
	it("aggregates app route contracts for OpenAPI and client generation", () => {
		expect(apiRouteContracts.map((route) => route.operationId)).toEqual([
			"getCurrentUser",
			"requestMagicLinkSignIn",
			"signOutCurrentUser",
			"createCharacter",
			"listCharacters",
			"getCharacter",
			"updateCharacterLevel",
			"updateCharacterName",
			"updateCharacterExperience",
			"updateCharacterHealth",
			"getCharacterSpellSlots",
			"updateCharacterSpellSlots",
			"useCharacterSpellSlot",
			"restoreCharacterSpellSlot",
			"applyCharacterSpellSlotDefaults",
			"listCharacterSpells",
			"getCharacterSpellDetails",
			"searchCharacterSpells",
			"saveCharacterSpell",
			"removeCharacterSpell",
			"getCharacterTreasury",
			"addCharacterTreasury",
			"spendCharacterTreasury",
			"convertCharacterTreasury",
			"previewAddCharacterTreasury",
			"previewSpendCharacterTreasury",
			"createCharacterItem",
			"listCharacterItems",
			"getCharacterItemDetails",
			"updateCharacterItem",
			"deleteCharacterItem",
			"equipCharacterItem",
			"unequipCharacterItem",
			"listCharacterHistory",
			"searchCatalogueItems",
			"getCatalogueItemDetails",
			"getCatalogueStatus",
		]);
		expect(apiRouteContracts.every((route) => route.path.startsWith("/api/"))).toBe(true);
	});
});
