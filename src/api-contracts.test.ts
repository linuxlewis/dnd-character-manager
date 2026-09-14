import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRouteContracts } from "./api-contracts.js";

describe("apiRouteContracts", () => {
	it("aggregates app route contracts for OpenAPI and client generation", () => {
		expect(apiRouteContracts.map((route) => route.operationId)).toEqual([
			"getCurrentUser",
			"requestMagicLinkSignIn",
			"signOutCurrentUser",
			"createCharacter",
			"getCharacter",
			"updateCharacterLevel",
			"updateCharacterName",
			"updateCharacterExperience",
			"updateCharacterHealth",
			"listCharacters",
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

vi.mock("postgres", () => ({
	default: vi.fn(() => {
		throw new Error("Contract registration must not initialize SQL");
	}),
}));

afterEach(() => {
	vi.unstubAllEnvs();
});

it("loads public runtime contracts without database configuration or SQL initialization", async () => {
	vi.resetModules();
	vi.stubEnv("DATABASE_URL", "");
	const { apiRouteContracts } = await import("./api-contracts.js");
	const { default: postgres } = await import("postgres");
	expect(apiRouteContracts.length).toBeGreaterThan(0);
	expect(postgres).not.toHaveBeenCalled();
});
