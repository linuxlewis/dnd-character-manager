import { describe, expect, it, vi } from "vitest";
import type { CharacterSpellRepository, DndApiSpellClient } from "../repo/index.js";
import type { CharacterSpell } from "../types/index.js";
import { CharacterNotFoundError, SpellSlotUnavailableError } from "./character-errors.js";
import { createCharacterSpellService } from "./character-spell-service.js";

describe("createCharacterSpellService", () => {
	it("searches D&D spells for an owned character and selected slot level", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.searchSpells.mockResolvedValue([
			{
				index: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
				source: "spell",
			},
		]);

		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.searchCharacterSpells("user-1", "character-1", {
				slotLevel: 3,
				query: "miss",
			}),
		).resolves.toEqual({
			spells: [
				{
					index: "magic-missile",
					name: "Magic Missile",
					level: 1,
					url: "/api/2014/spells/magic-missile",
					source: "spell",
				},
			],
		});
		expect(spellsClient.searchSpells).toHaveBeenCalledWith({ slotLevel: 3, query: "miss" });
	});

	it("saves a canonical D&D spell to the selected character slot level", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.findSpell.mockResolvedValue({
			index: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
			source: "spell",
		});
		repository.saveCharacterSpell.mockResolvedValue({
			spells: [savedSpell({ slotLevel: 3, spellIndex: "magic-missile", level: 1 })],
		});

		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.saveCharacterSpell("user-1", "character-1", {
				slotLevel: 3,
				spellIndex: "magic-missile",
				source: "spell",
			}),
		).resolves.toEqual({
			spells: [savedSpell({ slotLevel: 3, spellIndex: "magic-missile", level: 1 })],
		});
		expect(repository.saveCharacterSpell).toHaveBeenCalledWith("user-1", "character-1", {
			slotLevel: 3,
			spellIndex: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
			source: "spell",
		});
	});

	it("saves a canonical D&D feature to the selected character slot level", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.findSpell.mockResolvedValue({
			index: "divine-smite",
			name: "Divine Smite",
			level: 2,
			url: "/api/2014/features/divine-smite",
			source: "feature",
		});
		repository.saveCharacterSpell.mockResolvedValue({
			spells: [
				savedSpell({
					slotLevel: 1,
					spellIndex: "divine-smite",
					level: 2,
					source: "feature",
				}),
			],
		});

		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.saveCharacterSpell("user-1", "character-1", {
				slotLevel: 1,
				spellIndex: "divine-smite",
				source: "feature",
			}),
		).resolves.toEqual({
			spells: [
				savedSpell({
					slotLevel: 1,
					spellIndex: "divine-smite",
					level: 2,
					source: "feature",
				}),
			],
		});
		expect(spellsClient.findSpell).toHaveBeenCalledWith("divine-smite", "feature");
		expect(repository.saveCharacterSpell).toHaveBeenCalledWith("user-1", "character-1", {
			slotLevel: 1,
			spellIndex: "divine-smite",
			name: "Divine Smite",
			level: 2,
			url: "/api/2014/features/divine-smite",
			source: "feature",
		});
	});

	it("loads details for a saved character spell", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		repository.getCharacterSpell.mockResolvedValue(
			savedSpell({ slotLevel: 3, spellIndex: "magic-missile", level: 1 }),
		);
		spellsClient.getSpellDetails.mockResolvedValue({
			index: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
			source: "spell",
			desc: ["You create three glowing darts of magical force."],
			higherLevel: ["One more dart is created for each slot level above 1st."],
			metadata: [{ label: "Range", value: "120 feet" }],
		});

		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.getCharacterSpellDetails(
				"user-1",
				"character-1",
				"00000000-0000-4000-8000-000000000030",
			),
		).resolves.toEqual({
			spell: {
				...savedSpell({ slotLevel: 3, spellIndex: "magic-missile", level: 1 }),
				desc: ["You create three glowing darts of magical force."],
				higherLevel: ["One more dart is created for each slot level above 1st."],
				metadata: [{ label: "Range", value: "120 feet" }],
			},
		});
		expect(repository.getCharacterSpell).toHaveBeenCalledWith(
			"user-1",
			"character-1",
			"00000000-0000-4000-8000-000000000030",
		);
		expect(spellsClient.getSpellDetails).toHaveBeenCalledWith("magic-missile", "spell");
	});

	it("rejects saving a spell above the selected slot level", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.findSpell.mockResolvedValue({
			index: "fireball",
			name: "Fireball",
			level: 3,
			url: "/api/2014/spells/fireball",
			source: "spell",
		});

		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.saveCharacterSpell("user-1", "character-1", {
				slotLevel: 2,
				spellIndex: "fireball",
				source: "spell",
			}),
		).rejects.toThrow(SpellSlotUnavailableError);
		expect(repository.saveCharacterSpell).not.toHaveBeenCalled();
	});

	it("throws not found before searching or saving spells for another user's character", async () => {
		const repository = fakeRepository();
		repository.characterExists.mockResolvedValue(false);
		const spellsClient = fakeSpellsClient();
		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.searchCharacterSpells("user-2", "character-1", { slotLevel: 1, query: "" }),
		).rejects.toThrow(CharacterNotFoundError);
		await expect(
			service.saveCharacterSpell("user-2", "character-1", {
				slotLevel: 1,
				spellIndex: "magic-missile",
				source: "spell",
			}),
		).rejects.toThrow(CharacterNotFoundError);
		expect(spellsClient.searchSpells).not.toHaveBeenCalled();
		expect(spellsClient.findSpell).not.toHaveBeenCalled();
	});
});

function fakeRepository() {
	return {
		characterExists: vi.fn().mockResolvedValue(true),
		getCharacterSpell: vi.fn(),
		listCharacterSpells: vi.fn().mockResolvedValue([]),
		saveCharacterSpell: vi.fn(),
	} satisfies {
		[K in keyof CharacterSpellRepository]: CharacterSpellRepository[K] extends (
			...args: infer A
		) => infer R
			? ReturnType<typeof vi.fn<(...args: A) => R>>
			: never;
	};
}

function fakeSpellsClient() {
	return {
		searchSpells: vi.fn(),
		findSpell: vi.fn(),
		getSpellDetails: vi.fn(),
	} satisfies {
		[K in keyof DndApiSpellClient]: DndApiSpellClient[K] extends (...args: infer A) => infer R
			? ReturnType<typeof vi.fn<(...args: A) => R>>
			: never;
	};
}

function savedSpell({
	level,
	slotLevel,
	spellIndex,
	source = "spell",
}: {
	level: number;
	slotLevel: number;
	spellIndex: string;
	source?: "feature" | "spell";
}): CharacterSpell {
	return {
		id: "00000000-0000-4000-8000-000000000030",
		slotLevel,
		spellIndex,
		name:
			spellIndex === "fireball"
				? "Fireball"
				: spellIndex === "divine-smite"
					? "Divine Smite"
					: "Magic Missile",
		level,
		url: `/api/2014/${source === "feature" ? "features" : "spells"}/${spellIndex}`,
		source,
	};
}
