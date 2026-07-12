import { describe, expect, it, vi } from "vitest";
import type { CharacterRepository } from "../repo/index.js";
import { CharacterNotFoundError } from "./character-errors.js";
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

	it("updates a character level through the repository", async () => {
		const repository = {
			updateCharacterLevel: vi.fn(async () => ({
				id: "00000000-0000-4000-8000-000000000001",
				name: "Mira",
				className: "Fighter",
				level: 8,
				health: {
					currentHp: 18,
					maxHp: 18,
					temporaryHp: 0,
					effectiveMaxHp: 18,
				},
				recentHealthChanges: [],
			})),
		} as unknown as CharacterRepository;

		await expect(
			createCharacterService(repository).updateCharacterLevel("user-1", "character-1", {
				level: 8,
			}),
		).resolves.toMatchObject({ level: 8 });

		expect(repository.updateCharacterLevel).toHaveBeenCalledWith("user-1", "character-1", 8);
	});

	it("throws not found when a character level cannot be updated", async () => {
		const repository = {
			updateCharacterLevel: vi.fn(async () => null),
		} as unknown as CharacterRepository;

		await expect(
			createCharacterService(repository).updateCharacterLevel("user-1", "missing", {
				level: 8,
			}),
		).rejects.toThrow(CharacterNotFoundError);
	});
});
