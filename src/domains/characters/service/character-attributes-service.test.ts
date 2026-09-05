import { describe, expect, it, vi } from "vitest";
import type {
	CharacterAttributesPersistenceState,
	CharacterAttributesRepository,
} from "../repo/index.js";
import type { CharacterDetail } from "../types/index.js";
import { createCharacterAttributesService } from "./character-attributes-service.js";
import { CharacterNotFoundError } from "./character-errors.js";

const character: CharacterDetail = {
	id: "00000000-0000-4000-8000-000000000001",
	name: "Mira",
	className: "Fighter",
	level: 5,
	experiencePoints: 6_500,
	experience: {
		level: 5,
		experiencePoints: 6_500,
		currentLevelMinimum: 6_500,
		nextLevel: 6,
		nextLevelMinimum: 14_000,
		experienceIntoLevel: 0,
		experienceForNextLevel: 7_500,
		experienceRemaining: 7_500,
		progressPercent: 0,
		isMaxLevel: false,
	},
	health: {
		currentHp: 10,
		maxHp: 10,
		temporaryHp: 0,
		effectiveMaxHp: 10,
	},
	recentHealthChanges: [],
};

describe("createCharacterAttributesService", () => {
	it("authorizes reads and returns level-derived roll data", async () => {
		const repository = fakeRepository();
		repository.findCharacterAttributes.mockResolvedValue({
			level: 5,
			state: state({ dexterity: 16 }),
		});
		const characterService = fakeCharacterService();
		const service = createCharacterAttributesService({ repository, characterService });

		const response = await service.getCharacterAttributes("user-1", character.id);

		expect(characterService.getCharacter).toHaveBeenCalledWith("user-1", character.id);
		expect(repository.findCharacterAttributes).toHaveBeenCalledWith("user-1", character.id);
		expect(response.attributes.proficiencyBonus).toBe(3);
		expect(response.attributes.modifiers.dexterity).toBe(3);
		expect(
			response.attributes.rollReference.find((entry) => entry.id === "initiative"),
		).toMatchObject({
			total: 3,
			components: [{ type: "ability", label: "Dexterity", value: 3 }],
		});
	});

	it("replaces the complete state and returns authoritative recalculations", async () => {
		const repository = fakeRepository();
		const updated = state({ dexterity: 16, wisdom: 14 });
		repository.replaceCharacterAttributes.mockResolvedValue({ level: 5, state: updated });
		const service = createCharacterAttributesService({
			repository,
			characterService: fakeCharacterService(),
		});
		const input = {
			scores: { ...updated.scores },
			savingThrowProficiencies: updated.savingThrowProficiencies,
			skillProficiencies: updated.skillProficiencies,
		};

		const response = await service.updateCharacterAttributes("user-1", character.id, input);

		expect(repository.replaceCharacterAttributes).toHaveBeenCalledWith(
			"user-1",
			character.id,
			input,
		);
		expect(
			response.attributes.rollReference.find((entry) => entry.id === "initiative"),
		).toMatchObject({
			total: 3,
		});
		expect(
			response.attributes.rollReference.find((entry) => entry.id === "saving-throw-wisdom"),
		).toMatchObject({ total: 5 });
	});

	it("uses the repository snapshot level for every derived response", async () => {
		const repository = fakeRepository();
		repository.findCharacterAttributes.mockResolvedValue({ level: 1, state: state() });
		repository.replaceCharacterAttributes.mockResolvedValue({ level: 1, state: state() });
		const service = createCharacterAttributesService({
			repository,
			characterService: fakeCharacterService(),
		});

		const getResponse = await service.getCharacterAttributes("user-1", character.id);
		const updateResponse = await service.updateCharacterAttributes(
			"user-1",
			character.id,
			validInput(),
		);

		expect(getResponse.attributes.proficiencyBonus).toBe(2);
		expect(updateResponse.attributes.proficiencyBonus).toBe(2);
	});

	it("does not access the attributes repository for an inaccessible character", async () => {
		const repository = fakeRepository();
		const characterService = fakeCharacterService();
		characterService.getCharacter.mockRejectedValue(new CharacterNotFoundError());
		const service = createCharacterAttributesService({ repository, characterService });

		await expect(service.getCharacterAttributes("other-user", character.id)).rejects.toThrow(
			CharacterNotFoundError,
		);
		await expect(
			service.updateCharacterAttributes("other-user", character.id, validInput()),
		).rejects.toThrow(CharacterNotFoundError);
		expect(repository.findCharacterAttributes).not.toHaveBeenCalled();
		expect(repository.replaceCharacterAttributes).not.toHaveBeenCalled();
	});

	it("maps a repository ownership miss to not found", async () => {
		const repository = fakeRepository();
		repository.findCharacterAttributes.mockResolvedValue(null);
		const service = createCharacterAttributesService({
			repository,
			characterService: fakeCharacterService(),
		});

		await expect(service.getCharacterAttributes("user-1", character.id)).rejects.toThrow(
			CharacterNotFoundError,
		);
	});
});

function fakeRepository() {
	return {
		findCharacterAttributes: vi.fn(),
		replaceCharacterAttributes: vi.fn(),
	} as unknown as CharacterAttributesRepository & {
		findCharacterAttributes: ReturnType<typeof vi.fn>;
		replaceCharacterAttributes: ReturnType<typeof vi.fn>;
	};
}

function fakeCharacterService() {
	return {
		getCharacter: vi.fn().mockResolvedValue(character),
	};
}

function state(overrides: Partial<CharacterAttributesPersistenceState["scores"]> = {}) {
	return {
		scores: {
			strength: 10,
			dexterity: 10,
			constitution: 10,
			intelligence: 10,
			wisdom: 10,
			charisma: 10,
			...overrides,
		},
		savingThrowProficiencies: [
			{ key: "strength", rank: "none" },
			{ key: "dexterity", rank: "none" },
			{ key: "constitution", rank: "none" },
			{ key: "intelligence", rank: "none" },
			{ key: "wisdom", rank: "proficient" },
			{ key: "charisma", rank: "none" },
		],
		skillProficiencies: [
			{ key: "athletics", rank: "none" },
			{ key: "acrobatics", rank: "none" },
			{ key: "sleight-of-hand", rank: "none" },
			{ key: "stealth", rank: "expertise" },
			{ key: "arcana", rank: "none" },
			{ key: "history", rank: "none" },
			{ key: "investigation", rank: "none" },
			{ key: "nature", rank: "none" },
			{ key: "religion", rank: "none" },
			{ key: "animal-handling", rank: "none" },
			{ key: "insight", rank: "none" },
			{ key: "medicine", rank: "none" },
			{ key: "perception", rank: "proficient" },
			{ key: "survival", rank: "none" },
			{ key: "deception", rank: "none" },
			{ key: "intimidation", rank: "none" },
			{ key: "performance", rank: "none" },
			{ key: "persuasion", rank: "none" },
		],
	} satisfies CharacterAttributesPersistenceState;
}

function validInput() {
	const attributes = state();
	return {
		scores: attributes.scores,
		savingThrowProficiencies: attributes.savingThrowProficiencies,
		skillProficiencies: attributes.skillProficiencies,
	};
}
