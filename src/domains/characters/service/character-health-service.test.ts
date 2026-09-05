import { describe, expect, it, vi } from "vitest";
import type { CharacterHealthRepository } from "../repo/index.js";
import type { CharacterHealth } from "../types/index.js";
import { CharacterNotFoundError } from "./character-errors.js";
import {
	createCharacterHealthService,
	normalizeHealthUpdate,
	toHealthChange,
} from "./character-health-service.js";

const previousHealth: CharacterHealth = {
	currentHp: 10,
	maxHp: 20,
	temporaryHp: 0,
	effectiveMaxHp: 20,
};

describe("createCharacterHealthService", () => {
	it("normalizes a health update before saving it", async () => {
		const repository = fakeRepository();
		repository.mutateCharacterHealth.mockImplementation(async (_userId, _characterId, mutation) => {
			const result = mutation(previousHealth);
			return { health: result.health, recentHealthChanges: [] };
		});

		await expect(
			createCharacterHealthService(repository).updateCharacterHealth("user-1", "character-1", {
				currentHp: 10,
				maxHp: 20,
				temporaryHp: 5,
			}),
		).resolves.toEqual({
			health: {
				currentHp: 15,
				maxHp: 20,
				temporaryHp: 5,
				effectiveMaxHp: 25,
			},
			recentHealthChanges: [],
		});
		expect(repository.mutateCharacterHealth).toHaveBeenCalledWith(
			"user-1",
			"character-1",
			expect.any(Function),
		);
	});

	it("throws when the character health row cannot be found", async () => {
		const repository = fakeRepository();
		repository.mutateCharacterHealth.mockResolvedValue(null);

		await expect(
			createCharacterHealthService(repository).updateCharacterHealth("user-1", "character-1", {
				currentHp: 10,
				maxHp: 20,
				temporaryHp: 0,
			}),
		).rejects.toThrow(CharacterNotFoundError);
	});
});

describe("normalizeHealthUpdate", () => {
	it("adds increased temporary HP to current HP and effective max HP", () => {
		expect(
			normalizeHealthUpdate(previousHealth, {
				currentHp: 10,
				maxHp: 20,
				temporaryHp: 5,
			}),
		).toEqual({
			currentHp: 15,
			maxHp: 20,
			temporaryHp: 5,
			effectiveMaxHp: 25,
		});
	});

	it("clamps only when temporary HP decreases", () => {
		expect(
			normalizeHealthUpdate(
				{
					currentHp: 18,
					maxHp: 20,
					temporaryHp: 5,
					effectiveMaxHp: 25,
				},
				{
					currentHp: 18,
					maxHp: 20,
					temporaryHp: 2,
				},
			),
		).toEqual({
			currentHp: 18,
			maxHp: 20,
			temporaryHp: 2,
			effectiveMaxHp: 22,
		});
	});

	it("clamps current HP when max HP is lowered below it", () => {
		expect(
			normalizeHealthUpdate(previousHealth, {
				currentHp: 10,
				maxHp: 8,
				temporaryHp: 0,
			}),
		).toEqual({
			currentHp: 8,
			maxHp: 8,
			temporaryHp: 0,
			effectiveMaxHp: 8,
		});
	});

	it("adds increased max HP to current HP", () => {
		expect(
			normalizeHealthUpdate(previousHealth, {
				currentHp: 10,
				maxHp: 25,
				temporaryHp: 0,
			}),
		).toEqual({
			currentHp: 15,
			maxHp: 25,
			temporaryHp: 0,
			effectiveMaxHp: 25,
		});
	});
});

describe("toHealthChange", () => {
	it("returns null when normalized health did not change", () => {
		expect(toHealthChange(previousHealth, previousHealth)).toBeNull();
	});

	it("records HP, max HP, and temporary HP deltas", () => {
		expect(
			toHealthChange(previousHealth, {
				currentHp: 15,
				maxHp: 22,
				temporaryHp: 5,
				effectiveMaxHp: 27,
			}),
		).toMatchObject({
			currentHpDelta: 5,
			maxHpDelta: 2,
			temporaryHpDelta: 5,
		});
	});
});

function fakeRepository() {
	return {
		mutateCharacterHealth: vi.fn(),
		listRecentHealthChanges: vi.fn(),
	} as unknown as CharacterHealthRepository & {
		mutateCharacterHealth: ReturnType<typeof vi.fn>;
		listRecentHealthChanges: ReturnType<typeof vi.fn>;
	};
}
