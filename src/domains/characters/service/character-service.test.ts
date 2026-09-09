import { expect, it, vi } from "vitest";
import type { CharacterRepository } from "../repo/index.js";
import { CharacterNotFoundError } from "./character-errors.js";
import { createCharacterService } from "./character-service.js";

function repository() {
	return {
		listCharacters: vi.fn(async () => []),
		transferCharactersToUser: vi.fn(async () => 2),
		updateCharacterLevel: vi.fn(async () => "id" as string | null),
		updateCharacterName: vi.fn(async () => "id" as string | null),
		updateCharacterExperience: vi.fn(async () => "id" as string | null),
	} satisfies CharacterRepository;
}
it("delegates transfer and skips same-owner transfers", async () => {
	const repo = repository();
	const service = createCharacterService(repo);
	expect(await service.transferCharactersToUser("a", "b")).toBe(2);
	expect(repo.transferCharactersToUser).toHaveBeenCalledWith("a", "b");
	repo.transferCharactersToUser.mockClear();
	expect(await service.transferCharactersToUser("a", "a")).toBe(0);
	expect(repo.transferCharactersToUser).not.toHaveBeenCalled();
});
it("returns narrow identity mutation results and trims names", async () => {
	const repo = repository();
	const service = createCharacterService(repo);
	expect(await service.updateCharacterName("owner", "id", { name: " Mira Dawn " })).toBe("id");
	expect(repo.updateCharacterName).toHaveBeenCalledWith("owner", "id", "Mira Dawn");
	expect(await service.updateCharacterLevel("owner", "id", { level: 8 })).toBe("id");
	expect(repo.updateCharacterLevel).toHaveBeenCalledWith("owner", "id", 8);
	expect(await service.updateCharacterExperience("owner", "id", { experiencePoints: 27000 })).toBe(
		"id",
	);
	expect(repo.updateCharacterExperience).toHaveBeenCalledWith("owner", "id", 27000);
});
it("maps all denied mutations to character not found", async () => {
	const repo = repository();
	const service = createCharacterService(repo);
	repo.updateCharacterName.mockResolvedValue(null);
	repo.updateCharacterLevel.mockResolvedValue(null);
	repo.updateCharacterExperience.mockResolvedValue(null);
	await expect(service.updateCharacterName("owner", "id", { name: "Mira" })).rejects.toThrow(
		CharacterNotFoundError,
	);
	await expect(service.updateCharacterLevel("owner", "id", { level: 8 })).rejects.toThrow(
		CharacterNotFoundError,
	);
	await expect(
		service.updateCharacterExperience("owner", "id", { experiencePoints: 27000 }),
	).rejects.toThrow(CharacterNotFoundError);
});
