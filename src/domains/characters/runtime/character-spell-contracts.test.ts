import { describe, expect, it } from "vitest";
import { characterSpellRouteContracts } from "./character-spell-contracts.js";

describe("characterSpellRouteContracts", () => {
	it("declares the saved spell route client functions", () => {
		expect(characterSpellRouteContracts.map((route) => route.operationId)).toEqual([
			"listCharacterSpells",
			"getCharacterSpellDetails",
			"searchCharacterSpells",
			"saveCharacterSpell",
		]);
		expect(characterSpellRouteContracts.map((route) => route.client?.functionName)).toEqual([
			"listCharacterSpells",
			"getCharacterSpellDetails",
			"searchCharacterSpells",
			"saveCharacterSpell",
		]);
	});

	it("uses character path params for every saved spell route", () => {
		expect(characterSpellRouteContracts.every((route) => route.pathParams)).toBe(true);
	});
});
