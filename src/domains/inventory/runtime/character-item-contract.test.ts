import { describe, expect, it } from "vitest";
import { ListCharacterItemsRequestSchema } from "../types/index.js";
import { characterItemRouteContracts } from "./character-item-contract.js";

describe("character item route contracts", () => {
	it("declares all character item operations with stable paths", () => {
		expect(characterItemRouteContracts.map((route) => route.operationId)).toEqual([
			"createCharacterItem",
			"listCharacterItems",
			"getCharacterItemDetails",
			"updateCharacterItem",
			"deleteCharacterItem",
			"equipCharacterItem",
			"unequipCharacterItem",
		]);
		expect(characterItemRouteContracts.map((route) => route.path)).toEqual([
			"/api/characters/:characterId/items",
			"/api/characters/:characterId/items",
			"/api/characters/:characterId/items/:itemId",
			"/api/characters/:characterId/items/:itemId",
			"/api/characters/:characterId/items/:itemId",
			"/api/characters/:characterId/items/:itemId/equip",
			"/api/characters/:characterId/items/:itemId/unequip",
		]);
		expect(
			characterItemRouteContracts.find((route) => route.operationId === "deleteCharacterItem")
				?.responses[204],
		).toEqual({
			description: "Character item deleted",
		});
	});

	it("parses serialized boolean filters without making false truthy", () => {
		expect(ListCharacterItemsRequestSchema.parse({ isEquipped: "false" })).toEqual({
			isEquipped: false,
		});
		expect(ListCharacterItemsRequestSchema.parse({ isEquipped: "true" })).toEqual({
			isEquipped: true,
		});
	});
});
