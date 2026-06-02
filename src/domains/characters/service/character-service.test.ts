import { describe, expect, it, vi } from "vitest";
import type { CharacterRepo } from "../repo/character-repo.js";
import { createCharacterService } from "./character-service.js";

const userId = "00000000-0000-4000-8000-000000000001";
const character = {
	id: "00000000-0000-4000-8000-000000000002",
	userId,
	name: "Keira",
	class: "Bard" as const,
	level: 5,
	createdAt: new Date("2026-05-31T12:00:00.000Z"),
	updatedAt: new Date("2026-05-31T12:00:00.000Z"),
};

describe("createCharacterService", () => {
	it("normalizes create input before persistence", async () => {
		const repo = fakeRepo();
		repo.create.mockResolvedValue(character);
		const service = createCharacterService(repo);

		await service.createCharacter({
			userId,
			character: {
				name: "  Keira  ",
				class: "Bard",
				level: 5,
			},
		});

		expect(repo.create).toHaveBeenCalledWith({
			userId,
			name: "Keira",
			class: "Bard",
			level: 5,
		});
	});

	it("lists and reads characters through the repository", async () => {
		const repo = fakeRepo();
		repo.listByUser.mockResolvedValue([character]);
		repo.findByIdForUser.mockResolvedValue(character);
		const service = createCharacterService(repo);

		await expect(service.listCharacters(userId)).resolves.toEqual([character]);
		await expect(service.getCharacter({ id: character.id, userId })).resolves.toBe(character);
	});

	it("rejects invalid create input", async () => {
		const repo = fakeRepo();
		const service = createCharacterService(repo);

		await expect(
			service.createCharacter({
				userId,
				character: {
					name: "",
					class: "Wizard",
					level: 1,
				},
			}),
		).rejects.toThrow();
		expect(repo.create).not.toHaveBeenCalled();
	});
});

function fakeRepo() {
	return {
		create: vi.fn(),
		findByIdForUser: vi.fn(),
		listByUser: vi.fn(),
	} satisfies CharacterRepo;
}
