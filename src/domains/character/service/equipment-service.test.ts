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
	conditions: [],
	concentration: false,
	spellSlots: [],
	equipment: [],
	skills: [],
	armorClass: { base: 10, override: null },
	savingThrowProficiencies: [],
	notes: "",
};

describe("equipmentService via characterService", () => {
	afterEach(async () => {
		await characterRepo._clear();
	});

	it("addEquipment supports category and description fields", async () => {
		const char = await characterService.createCharacter(validInput);
		const updated = await characterService.addEquipment(char.id, {
			name: "Chain Mail",
			quantity: 1,
			weight: 55,
			equipped: false,
			category: "armor",
			description: "AC 16, disadvantage on stealth",
		});
		expect(updated?.equipment[0].category).toBe("armor");
		expect(updated?.equipment[0].description).toBe("AC 16, disadvantage on stealth");
	});

	it("addEquipment defaults category to gear", async () => {
		const char = await characterService.createCharacter(validInput);
		const updated = await characterService.addEquipment(char.id, {
			name: "Rope",
			quantity: 1,
			weight: 10,
			equipped: false,
		});
		expect(updated?.equipment[0].category).toBe("gear");
		expect(updated?.equipment[0].description).toBe("");
	});

	it("toggleEquipItem flips equipped state", async () => {
		const char = await characterService.createCharacter(validInput);
		const withItem = await characterService.addEquipment(char.id, {
			name: "Longsword",
			quantity: 1,
			weight: 3,
			equipped: false,
		});
		const itemId = withItem?.equipment[0].id as string;
		const toggled = await characterService.toggleEquipItem(char.id, itemId);
		expect(toggled?.equipment[0].equipped).toBe(true);
		const toggled2 = await characterService.toggleEquipItem(char.id, itemId);
		expect(toggled2?.equipment[0].equipped).toBe(false);
	});

	it("toggleEquipItem returns null for missing character", async () => {
		const result = await characterService.toggleEquipItem("nonexistent", "some-id");
		expect(result).toBeNull();
	});

	it("toggleEquipItem throws for missing item", async () => {
		const char = await characterService.createCharacter(validInput);
		await expect(characterService.toggleEquipItem(char.id, "nonexistent")).rejects.toThrow(
			"Equipment item nonexistent not found",
		);
	});

	it("updateEquipmentItem updates item properties", async () => {
		const char = await characterService.createCharacter(validInput);
		const withItem = await characterService.addEquipment(char.id, {
			name: "Longsword",
			quantity: 1,
			weight: 3,
			equipped: false,
			category: "weapon",
		});
		const itemId = withItem?.equipment[0].id as string;
		const updated = await characterService.updateEquipmentItem(char.id, itemId, {
			name: "Magical Longsword",
			description: "+1 to attack",
		});
		expect(updated?.equipment[0].name).toBe("Magical Longsword");
		expect(updated?.equipment[0].description).toBe("+1 to attack");
		expect(updated?.equipment[0].category).toBe("weapon");
	});

	it("updateEquipmentItem returns null for missing character", async () => {
		const result = await characterService.updateEquipmentItem("nonexistent", "some-id", {
			name: "Test",
		});
		expect(result).toBeNull();
	});

	it("updateEquipmentItem throws for missing item", async () => {
		const char = await characterService.createCharacter(validInput);
		await expect(
			characterService.updateEquipmentItem(char.id, "nonexistent", { name: "Test" }),
		).rejects.toThrow("Equipment item nonexistent not found");
	});
});
