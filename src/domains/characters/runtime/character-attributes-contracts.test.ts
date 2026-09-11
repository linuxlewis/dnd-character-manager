import { describe, expect, it } from "vitest";
import { characterAttributesRouteContracts } from "./character-attributes-contracts.js";

describe("characterAttributesRouteContracts", () => {
	it("declares the typed GET and atomic PUT boundaries", () => {
		expect(characterAttributesRouteContracts.map((route) => route.operationId)).toEqual([
			"getCharacterAttributes",
			"updateCharacterAttributes",
		]);
		expect(characterAttributesRouteContracts.map((route) => route.client?.functionName)).toEqual([
			"getCharacterAttributes",
			"updateCharacterAttributes",
		]);
		expect(characterAttributesRouteContracts[0].responses).toHaveProperty("400");
		expect(characterAttributesRouteContracts[0].responses).toHaveProperty("404");
		expect(characterAttributesRouteContracts[1].responses).toHaveProperty("400");
		expect(characterAttributesRouteContracts[1].responses).toHaveProperty("404");
	});
});
