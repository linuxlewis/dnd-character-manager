import { describe, expect, it } from "vitest";
import { characterRouteContracts } from "./contract.js";

describe("characterRouteContracts", () => {
	it("declares stable operation ids and generated client names", () => {
		expect(characterRouteContracts.map((route) => route.operationId)).toEqual([
			"createCharacter",
			"listCharacters",
			"getCharacter",
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
		]);
		expect(characterRouteContracts.map((route) => route.client?.functionName)).toEqual([
			"createCharacter",
			"listCharacters",
			"getCharacter",
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
		]);
	});

	it("uses characterId path params for detail, health, and spell slot routes", () => {
		const routeWithParams = characterRouteContracts.filter((route) => route.path.includes(":"));

		expect(routeWithParams).toHaveLength(12);
		expect(routeWithParams.every((route) => "pathParams" in route)).toBe(true);
	});
});
