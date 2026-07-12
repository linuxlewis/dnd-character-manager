import { describe, expect, it, vi } from "vitest";
import type { CharacterRepository } from "../repo/index.js";
import { createCharacterService } from "./character-service.js";

describe("createCharacterService", () => {
	it("trims user-entered character text before persistence", async () => {
		const repository = {
			createCharacter: vi.fn(async (input) => ({
				id: "00000000-0000-4000-8000-000000000001",
				name: input.name,
				className: input.className,
				level: input.level,
				health: {
					currentHp: input.maxHp,
					maxHp: input.maxHp,
					temporaryHp: 0,
					effectiveMaxHp: input.maxHp,
				},
				recentHealthChanges: [],
			})),
		} as unknown as CharacterRepository;

		await createCharacterService(repository).createCharacter("user-1", {
			name: " Mira ",
			className: "Fighter",
			level: 2,
			maxHp: 18,
		});

		expect(repository.createCharacter).toHaveBeenCalledWith({
			userId: "user-1",
			name: "Mira",
			className: "Fighter",
			level: 2,
			maxHp: 18,
		});
	});

	it("delegates anonymous character transfer for linked accounts", async () => {
		const repository = {
			transferCharactersToUser: vi.fn(async () => 2),
		} as unknown as CharacterRepository;

		await expect(
			createCharacterService(repository).transferCharactersToUser("anonymous-user", "linked-user"),
		).resolves.toBe(2);

		expect(repository.transferCharactersToUser).toHaveBeenCalledWith(
			"anonymous-user",
			"linked-user",
		);
	});

	it("skips transfer when the anonymous and linked account ids match", async () => {
		const repository = {
			transferCharactersToUser: vi.fn(async () => 1),
		} as unknown as CharacterRepository;

		await expect(
			createCharacterService(repository).transferCharactersToUser("same-user", "same-user"),
		).resolves.toBe(0);

		expect(repository.transferCharactersToUser).not.toHaveBeenCalled();
	});
});
