import { describe, expect, it } from "vitest";
import { CharacterHistoryPersistenceError } from "./character-history-errors.js";

describe("character history errors", () => {
	it("provides a stable persistence boundary and preserves the cause", () => {
		const cause = new Error("database row is malformed");
		const error = new CharacterHistoryPersistenceError(undefined, cause);

		expect(error).toMatchObject({
			name: "CharacterHistoryPersistenceError",
			message: "Character history persistence failed.",
			cause,
		});
	});
});
