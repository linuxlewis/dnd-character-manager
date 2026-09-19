import { expect, it } from "vitest";
import { characterRouteContracts } from "./contract.js";

it("keeps identity and attribute operations", () => {
	expect(characterRouteContracts.map((route) => route.operationId)).toEqual([
		"listCharacters",
		"getCharacterAttributes",
		"updateCharacterAttributes",
	]);
	expect(
		characterRouteContracts
			.filter((route) => route.path.includes(":"))
			.every((route) => Object.hasOwn(route, "pathParams")),
	).toBe(true);
});
