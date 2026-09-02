import { describe, expect, it } from "vitest";
import {
	CatalogueItemNotFoundError,
	CatalogueItemUnavailableError,
	CharacterItemNotFoundError,
	CharacterItemPersistenceError,
} from "./character-item-errors.js";

describe("character item errors", () => {
	it("provides stable error names and messages for route mapping", () => {
		expect(new CharacterItemNotFoundError()).toMatchObject({
			name: "CharacterItemNotFoundError",
			message: "Character item not found.",
		});
		expect(new CatalogueItemNotFoundError()).toMatchObject({
			name: "CatalogueItemNotFoundError",
			message: "Catalogue item not found.",
		});
		expect(new CatalogueItemUnavailableError()).toMatchObject({
			name: "CatalogueItemUnavailableError",
			message: "Catalogue item data is unavailable.",
		});
		expect(new CharacterItemPersistenceError()).toMatchObject({
			name: "CharacterItemPersistenceError",
			message: "Character item persistence failed.",
		});
	});
});
