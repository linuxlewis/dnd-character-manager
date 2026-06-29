import { describe, expect, it } from "vitest";
import { CharacterNotFoundError } from "./character-errors.js";

describe("CharacterNotFoundError", () => {
	it("uses the shared character not-found message", () => {
		const error = new CharacterNotFoundError();

		expect(error.name).toBe("CharacterNotFoundError");
		expect(error.message).toBe("Character not found.");
	});
});
