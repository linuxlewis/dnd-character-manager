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
	skills: [],
	armorClass: { base: 10, override: null },
	savingThrowProficiencies: [],
	notes: "",
};

describe("characterService AC & Saving Throws", () => {
	afterEach(async () => {
		await characterRepo._clear();
	});

	it("setAcOverride sets override value", async () => {
		const created = await characterService.createCharacter(validInput);
		const updated = await characterService.setAcOverride(created.id, 16);
		expect(updated).not.toBeNull();
		expect(updated?.armorClass.override).toBe(16);
	});

	it("setAcOverride clears override with null", async () => {
		const created = await characterService.createCharacter(validInput);
		await characterService.setAcOverride(created.id, 16);
		const updated = await characterService.setAcOverride(created.id, null);
		expect(updated).not.toBeNull();
		expect(updated?.armorClass.override).toBeNull();
	});

	it("setAcOverride returns null for missing character", async () => {
		const result = await characterService.setAcOverride("nonexistent", 16);
		expect(result).toBeNull();
	});

	it("toggleSavingThrowProficiency adds ability key if not present", async () => {
		const created = await characterService.createCharacter(validInput);
		const updated = await characterService.toggleSavingThrowProficiency(created.id, "STR");
		expect(updated).not.toBeNull();
		expect(updated?.savingThrowProficiencies).toContain("STR");
	});

	it("toggleSavingThrowProficiency removes ability key if already present", async () => {
		const created = await characterService.createCharacter(validInput);
		await characterService.toggleSavingThrowProficiency(created.id, "STR");
		const updated = await characterService.toggleSavingThrowProficiency(created.id, "STR");
		expect(updated).not.toBeNull();
		expect(updated?.savingThrowProficiencies).not.toContain("STR");
	});

	it("toggleSavingThrowProficiency returns null for missing character", async () => {
		const result = await characterService.toggleSavingThrowProficiency("nonexistent", "STR");
		expect(result).toBeNull();
	});
});
