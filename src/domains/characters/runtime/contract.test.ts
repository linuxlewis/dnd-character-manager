import { expect, it } from "vitest";
import { characterRouteContracts } from "./contract.js";

it("keeps the identity list operation", () => {
	expect(characterRouteContracts.map((route) => route.operationId)).toEqual(["listCharacters"]);
});
