import { describe, expect, it } from "vitest";
import { spellcastingRouteContracts } from "./contract.js";

describe("spellcastingRouteContracts", () => {
	it("declares stable operation ids and generated client names", () => {
		expect(spellcastingRouteContracts.map((route) => route.operationId)).toEqual([
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
		expect(spellcastingRouteContracts.map((route) => route.client?.functionName)).toEqual([
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

	it("uses path params for character detail and update routes", () => {
		const routeWithParams = spellcastingRouteContracts.filter((route) => route.path.includes(":"));

		expect(routeWithParams).toHaveLength(10);
		expect(routeWithParams.every((route) => "pathParams" in route)).toBe(true);
	});
});
