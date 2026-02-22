import { afterEach, describe, expect, it } from "vitest";
import { characterRepo } from "../repo/character-repo.js";
import type { CreateCharacter } from "../types/index.js";
import { characterService } from "./character-service.js";

const validInput: CreateCharacter = {
	name: "Gandalf",
	race: "Human",
	class: "Wizard",
	level: 20,
	abilityScores: { STR: 10, DEX: 14, CON: 12, INT: 20, WIS: 18, CHA: 16 },
	hp: { current: 100, max: 100, temp: 0 },
	spellSlots: [],
	equipment: [],
	notes: "",
};

describe("characterService", () => {
	afterEach(async () => {
		await characterRepo._clear();
	});

	it("creates a character with validation", async () => {
		const char = await characterService.createCharacter(validInput);
		expect(char.id).toBeDefined();
		expect(char.name).toBe("Gandalf");
		expect(char.createdAt).toBeInstanceOf(Date);
	});

	it("rejects invalid input on create", async () => {
		await expect(
			characterService.createCharacter({
				...validInput,
				name: "",
			}),
		).rejects.toThrow();
	});

	it("lists characters", async () => {
		await characterService.createCharacter(validInput);
		await characterService.createCharacter({ ...validInput, name: "Frodo" });
		const list = await characterService.listCharacters();
		expect(list).toHaveLength(2);
	});

	it("gets a character by id", async () => {
		const created = await characterService.createCharacter(validInput);
		const found = await characterService.getCharacter(created.id);
		expect(found).toEqual(created);
	});

	it("returns null for missing id", async () => {
		const found = await characterService.getCharacter("00000000-0000-0000-0000-000000000000");
		expect(found).toBeNull();
	});

	it("updates a character with validation", async () => {
		const created = await characterService.createCharacter(validInput);
		const updated = await characterService.updateCharacter(created.id, {
			name: "Gandalf the White",
		});
		expect(updated?.name).toBe("Gandalf the White");
	});

	it("rejects invalid input on update", async () => {
		const created = await characterService.createCharacter(validInput);
		const badInput = { level: 0 };
		await expect(characterService.updateCharacter(created.id, badInput)).rejects.toThrow();
	});

	it("returns null when updating missing id", async () => {
		const result = await characterService.updateCharacter("00000000-0000-0000-0000-000000000000", {
			name: "Nobody",
		});
		expect(result).toBeNull();
	});

	it("deletes a character", async () => {
		const created = await characterService.createCharacter(validInput);
		const deleted = await characterService.deleteCharacter(created.id);
		expect(deleted).toBe(true);
		const found = await characterService.getCharacter(created.id);
		expect(found).toBeNull();
	});

	it("returns false when deleting missing id", async () => {
		const deleted = await characterService.deleteCharacter("00000000-0000-0000-0000-000000000000");
		expect(deleted).toBe(false);
	});
});
