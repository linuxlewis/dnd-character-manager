import { describe, expect, it } from "vitest";
import { createCharacterInventoryScopeRepository } from "./character-inventory-scope-repository.js";

describe("CharacterInventoryScopeRepository", () => {
	it("validates character IDs before reaching persistence", async () => {
		const repository = createCharacterInventoryScopeRepository();

		await expect(repository.findCharacterScopeId("not-a-uuid")).rejects.toThrow();
		await expect(repository.ensureCharacterScopeId("not-a-uuid")).rejects.toThrow();
	});
});
