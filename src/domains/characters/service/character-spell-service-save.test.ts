import { describe, expect, it, vi } from "vitest";
import type { CharacterSpellRepository, DndApiSpellClient } from "../repo/index.js";
import type { CharacterSpell } from "../types/index.js";
import { SpellSlotUnavailableError } from "./character-errors.js";
import { createCharacterSpellService } from "./character-spell-service.js";

describe("createCharacterSpellService save behavior", () => {
	it("saves a canonical D&D spell to the selected character slot level", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.findSpell.mockResolvedValue(spellResult("magic-missile", 1));
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
			url: "/api/2024/spells/magic-missile",
			source: "spell",
		});
	});

	it("saves a canonical D&D feature to the non-slot bucket", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.findSpell.mockResolvedValue(featureResult("divine-smite", 2));
		repository.saveCharacterSpell.mockResolvedValue({
			spells: [
				savedSpell({
					slotLevel: 0,
					spellIndex: "divine-smite",
					level: 2,
					source: "feature",
				}),
			],
		});

		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.saveCharacterSpell("user-1", "character-1", {
				slotLevel: 0,
				spellIndex: "divine-smite",
				source: "feature",
			}),
		).resolves.toEqual({
			spells: [
				savedSpell({
					slotLevel: 0,
					spellIndex: "divine-smite",
					level: 2,
					source: "feature",
				}),
			],
		});
		expect(spellsClient.findSpell).toHaveBeenCalledWith("divine-smite", "feature");
		expect(repository.saveCharacterSpell).toHaveBeenCalledWith("user-1", "character-1", {
			slotLevel: 0,
			spellIndex: "divine-smite",
			name: "Divine Smite",
			level: 2,
			url: "/api/2014/features/divine-smite",
			source: "feature",
		});
	});

	it("saves a canonical cantrip to the non-slot bucket", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.findSpell.mockResolvedValue(spellResult("light", 0));
		repository.saveCharacterSpell.mockResolvedValue({
			spells: [savedSpell({ slotLevel: 0, spellIndex: "light", level: 0 })],
		});

		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.saveCharacterSpell("user-1", "character-1", {
				slotLevel: 0,
				spellIndex: "light",
				source: "spell",
			}),
		).resolves.toEqual({
			spells: [savedSpell({ slotLevel: 0, spellIndex: "light", level: 0 })],
		});
		expect(repository.saveCharacterSpell).toHaveBeenCalledWith("user-1", "character-1", {
			slotLevel: 0,
			spellIndex: "light",
			name: "Light",
			level: 0,
			url: "/api/2024/spells/light",
			source: "spell",
		});
	});

	it("rejects saving a spell above the selected slot level", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.findSpell.mockResolvedValue(spellResult("fireball", 3));

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

	it("rejects saving cantrips to numbered slots and leveled spells to the non-slot bucket", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		const service = createCharacterSpellService(repository, spellsClient);

		spellsClient.findSpell.mockResolvedValueOnce(spellResult("light", 0));
		await expect(
			service.saveCharacterSpell("user-1", "character-1", {
				slotLevel: 1,
				spellIndex: "light",
				source: "spell",
			}),
		).rejects.toThrow(SpellSlotUnavailableError);

		spellsClient.findSpell.mockResolvedValueOnce(spellResult("magic-missile", 1));
		await expect(
			service.saveCharacterSpell("user-1", "character-1", {
				slotLevel: 0,
				spellIndex: "magic-missile",
				source: "spell",
			}),
		).rejects.toThrow(SpellSlotUnavailableError);

		expect(repository.saveCharacterSpell).not.toHaveBeenCalled();
	});

	it("rejects saving features to numbered spell slots", async () => {
		const repository = fakeRepository();
		const spellsClient = fakeSpellsClient();
		spellsClient.findSpell.mockResolvedValue(featureResult("lay-on-hands", 1));

		const service = createCharacterSpellService(repository, spellsClient);

		await expect(
			service.saveCharacterSpell("user-1", "character-1", {
				slotLevel: 1,
				spellIndex: "lay-on-hands",
				source: "feature",
			}),
		).rejects.toThrow(SpellSlotUnavailableError);
		expect(repository.saveCharacterSpell).not.toHaveBeenCalled();
	});
});

function fakeRepository() {
	return {
		characterExists: vi.fn().mockResolvedValue(true),
		getCharacterSpell: vi.fn(),
		listCharacterSpells: vi.fn().mockResolvedValue([]),
		removeCharacterSpell: vi.fn(),
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

function spellResult(spellIndex: string, level: number) {
	return {
		index: spellIndex,
		name: spellName(spellIndex),
		level,
		url: `/api/2024/spells/${spellIndex}`,
		source: "spell" as const,
	};
}

function featureResult(spellIndex: string, level: number) {
	return {
		index: spellIndex,
		name: spellName(spellIndex),
		level,
		url: `/api/2014/features/${spellIndex}`,
		source: "feature" as const,
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
		name: spellName(spellIndex),
		level,
		url:
			source === "feature" ? `/api/2014/features/${spellIndex}` : `/api/2024/spells/${spellIndex}`,
		source,
	};
}

function spellName(spellIndex: string) {
	const names: Record<string, string> = {
		"divine-smite": "Divine Smite",
		fireball: "Fireball",
		"lay-on-hands": "Lay on Hands",
		light: "Light",
		"magic-missile": "Magic Missile",
	};
	return names[spellIndex] ?? "Magic Missile";
}
