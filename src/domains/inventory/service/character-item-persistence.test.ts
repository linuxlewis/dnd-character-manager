import { describe, expect, it } from "vitest";
import { CharacterItemPersistenceError } from "./character-item-errors.js";
import { repositoryCall } from "./character-item-persistence.js";

describe("character item persistence boundary", () => {
	it("maps repository failures to the service error", async () => {
		await expect(
			repositoryCall("find", async () => Promise.reject(new Error("offline"))),
		).rejects.toBeInstanceOf(CharacterItemPersistenceError);
	});
});
