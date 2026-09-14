import { expect, it } from "vitest";
import { apiRouteContracts } from "../../api-contracts.js";
import { characterDetailRouteContracts } from "./contract.js";

it("registers creation once with its existing HTTP and generated client contract", () => {
	const [creation] = characterDetailRouteContracts;
	expect(creation).toMatchObject({
		operationId: "createCharacter",
		method: "post",
		path: "/api/characters",
		client: { functionName: "createCharacter", responseType: "CharacterDetailResponse" },
	});
	expect(Object.keys(creation.responses)).toEqual(["201", "400"]);
	expect(apiRouteContracts.filter((route) => route.operationId === "createCharacter")).toEqual([
		creation,
	]);
});

it("owns all five combined response contracts exactly once", () => {
	expect(characterDetailRouteContracts.map((route) => route.operationId)).toEqual([
		"createCharacter",
		"getCharacter",
		"updateCharacterLevel",
		"updateCharacterName",
		"updateCharacterExperience",
	]);
	for (const route of characterDetailRouteContracts) {
		expect(apiRouteContracts.filter((item) => item.operationId === route.operationId)).toEqual([
			route,
		]);
		expect(route.client.responseType).toBe("CharacterDetailResponse");
	}
});
