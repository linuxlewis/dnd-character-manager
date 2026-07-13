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

	it("trims and updates a character name through the repository", async () => {
		const repository = {
			updateCharacterName: vi.fn(async (_userId, _characterId, name) => ({
				id: "00000000-0000-4000-8000-000000000001",
				name,
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
			createCharacterService(repository).updateCharacterName("user-1", "character-1", {
				name: " Mira Dawn ",
			}),
		).resolves.toMatchObject({ name: "Mira Dawn" });

		expect(repository.updateCharacterName).toHaveBeenCalledWith(
			"user-1",
			"character-1",
			"Mira Dawn",
		);
	});

	it("updates character experience through the repository", async () => {
		const repository = {
			updateCharacterExperience: vi.fn(async (_userId, _characterId, experiencePoints) => ({
				id: "00000000-0000-4000-8000-000000000001",
				name: "Mira",
				className: "Fighter",
				level: 7,
				experiencePoints,
				experience: {
					level: 7,
					experiencePoints,
					currentLevelMinimum: 23_000,
					nextLevel: 8,
					nextLevelMinimum: 34_000,
					experienceIntoLevel: 4_000,
					experienceForNextLevel: 11_000,
					experienceRemaining: 7_000,
					progressPercent: 36,
					isMaxLevel: false,
				},
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
			createCharacterService(repository).updateCharacterExperience("user-1", "character-1", {
				experiencePoints: 27_000,
			}),
		).resolves.toMatchObject({ experiencePoints: 27_000 });

		expect(repository.updateCharacterExperience).toHaveBeenCalledWith(
			"user-1",
			"character-1",
			27_000,
		);
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

	it("throws not found when character experience cannot be updated", async () => {
		const repository = {
			updateCharacterExperience: vi.fn(async () => null),
		} as unknown as CharacterRepository;

		await expect(
			createCharacterService(repository).updateCharacterExperience("user-1", "missing", {
				experiencePoints: 27_000,
			}),
		).rejects.toThrow(CharacterNotFoundError);
	});

	it("throws not found when a character name cannot be updated", async () => {
		const repository = {
			updateCharacterName: vi.fn(async () => null),
		} as unknown as CharacterRepository;

		await expect(
			createCharacterService(repository).updateCharacterName("user-1", "missing", {
				name: "Mira Dawn",
			}),
		).rejects.toThrow(CharacterNotFoundError);
	});
});
