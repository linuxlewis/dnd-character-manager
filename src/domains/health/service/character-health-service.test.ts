import { expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import { createCharacterHealthService } from "./character-health-service.js";

it("passes absolute input to the atomic repository and returns its result", async () => {
	const input = { currentHp: 10, maxHp: 20, temporaryHp: 5 };
	const result = {
		health: { ...input, currentHp: 15, effectiveMaxHp: 25 },
		recentHealthChanges: [],
	};
	const repository = { updateCharacterHealth: vi.fn(async () => result) };
	await expect(
		createCharacterHealthService(repository).updateCharacterHealth("owner", "character", input),
	).resolves.toEqual(result);
	expect(repository.updateCharacterHealth).toHaveBeenCalledWith("owner", "character", input);
});
it("maps missing owned health to existing not found", async () => {
	const repository = { updateCharacterHealth: vi.fn(async () => null) };
	await expect(
		createCharacterHealthService(repository).updateCharacterHealth("owner", "character", {
			currentHp: 10,
			maxHp: 20,
			temporaryHp: 0,
		}),
	).rejects.toThrow(CharacterNotFoundError);
});
