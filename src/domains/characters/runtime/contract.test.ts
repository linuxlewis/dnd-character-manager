import { describe, expect, it } from "vitest";
import { characterRouteContracts } from "./contract.js";

describe("characterRouteContracts", () => {
	it("defines the browser-callable character routes", () => {
		expect(characterRouteContracts.map((route) => route.operationId)).toEqual([
			"listCharacters",
			"createCharacter",
			"getCharacter",
		]);
		expect(characterRouteContracts.map((route) => route.client?.functionName)).toEqual([
			"listCharacters",
			"createCharacter",
			"getCharacter",
		]);
	});

	it("uses path params for character detail routes", () => {
		const detailContract = characterRouteContracts.find(
			(route) => route.operationId === "getCharacter",
		);

		expect(detailContract?.path).toBe("/api/characters/:id");
		expect(detailContract?.client?.pathParamsType).toBe("CharacterParams");
	});
});
