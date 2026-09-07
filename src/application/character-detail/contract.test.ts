import { expect, it } from "vitest";
import { apiRouteContracts } from "../../api-contracts.js";
import { characterCreationRouteContracts } from "./contract.js";

it("registers creation once with its existing HTTP and generated client contract", () => {
	const [creation] = characterCreationRouteContracts;
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
