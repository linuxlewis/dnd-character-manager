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

describe("characterService actions", () => {
	afterEach(async () => {
		await characterRepo._clear();
	});

	it("dealDamage reduces character HP and persists", async () => {
		const char = await characterService.createCharacter(validInput);
		const damaged = await characterService.dealDamage(char.id, 30);
		expect(damaged).not.toBeNull();
		expect(damaged?.hp.current).toBe(70);
		const fetched = await characterService.getCharacter(char.id);
		expect(fetched?.hp.current).toBe(70);
	});

	it("dealDamage consumes temp HP first", async () => {
		const char = await characterService.createCharacter({
			...validInput,
			hp: { current: 100, max: 100, temp: 12 },
		});
		const damaged = await characterService.dealDamage(char.id, 15);
		expect(damaged?.hp.temp).toBe(0);
		expect(damaged?.hp.current).toBe(97);
	});

	it("dealDamage returns null for missing character", async () => {
		const result = await characterService.dealDamage("nonexistent", 10);
		expect(result).toBeNull();
	});

	it("dealDamage floors HP at 0", async () => {
		const char = await characterService.createCharacter(validInput);
		const damaged = await characterService.dealDamage(char.id, 999);
		expect(damaged?.hp.current).toBe(0);
	});

	it("healCharacter increases character HP and persists", async () => {
		const char = await characterService.createCharacter(validInput);
		await characterService.dealDamage(char.id, 50);
		const healed = await characterService.healCharacter(char.id, 20);
		expect(healed).not.toBeNull();
		expect(healed?.hp.current).toBe(70);
		const fetched = await characterService.getCharacter(char.id);
		expect(fetched?.hp.current).toBe(70);
	});

	it("healCharacter returns null for missing character", async () => {
		const result = await characterService.healCharacter("nonexistent", 10);
		expect(result).toBeNull();
	});

	it("healCharacter caps HP at max", async () => {
		const char = await characterService.createCharacter(validInput);
		const healed = await characterService.healCharacter(char.id, 50);
		expect(healed?.hp.current).toBe(100);
	});

	it("setTempHp updates temporary hit points", async () => {
		const char = await characterService.createCharacter(validInput);
		const updated = await characterService.setTempHp(char.id, 9);
		expect(updated?.hp.temp).toBe(9);
	});

	it("setMaxHp updates max hit points and clamps current", async () => {
		const char = await characterService.createCharacter(validInput);
		const updated = await characterService.setMaxHp(char.id, 40);
		expect(updated?.hp.max).toBe(40);
		expect(updated?.hp.current).toBe(40);
	});

	it("setConcentration toggles concentration state", async () => {
		const char = await characterService.createCharacter(validInput);
		const updated = await characterService.setConcentration(char.id, true);
		expect(updated?.concentration).toBe(true);
	});

	it("toggleCondition adds and removes conditions", async () => {
		const char = await characterService.createCharacter(validInput);
		const added = await characterService.toggleCondition(char.id, "Blinded", 3);
		expect(added?.conditions).toEqual([{ name: "Blinded", durationRounds: 3 }]);
		const removed = await characterService.toggleCondition(char.id, "Blinded");
		expect(removed?.conditions).toEqual([]);
	});

	it("toggleSkillProficiency flips proficient boolean", async () => {
		const char = await characterService.createCharacter({
			...validInput,
			skills: [{ name: "Stealth", abilityKey: "DEX", proficient: false }],
		});
		const toggled = await characterService.toggleSkillProficiency(char.id, "Stealth");
		expect(toggled).not.toBeNull();
		expect(toggled?.skills.find((s) => s.name === "Stealth")?.proficient).toBe(true);
		const toggled2 = await characterService.toggleSkillProficiency(char.id, "Stealth");
		expect(toggled2?.skills.find((s) => s.name === "Stealth")?.proficient).toBe(false);
	});

	it("toggleSkillProficiency returns null for missing character", async () => {
		const result = await characterService.toggleSkillProficiency("nonexistent", "Stealth");
		expect(result).toBeNull();
	});

	it("addEquipment appends validated equipment item", async () => {
		const char = await characterService.createCharacter(validInput);
		const updated = await characterService.addEquipment(char.id, {
			name: "Longsword",
			quantity: 1,
			weight: 3,
			equipped: true,
		});
		expect(updated).not.toBeNull();
		expect(updated?.equipment).toHaveLength(1);
		expect(updated?.equipment[0].name).toBe("Longsword");
		expect(updated?.equipment[0].id).toBeDefined();
	});

	it("addEquipment returns null for missing character", async () => {
		const result = await characterService.addEquipment("nonexistent", {
			name: "Shield",
			quantity: 1,
			weight: 6,
			equipped: false,
		});
		expect(result).toBeNull();
	});

	it("removeEquipment removes item by ID", async () => {
		const char = await characterService.createCharacter(validInput);
		const withItem = await characterService.addEquipment(char.id, {
			name: "Longsword",
			quantity: 1,
			weight: 3,
			equipped: true,
		});
		const itemId = withItem?.equipment[0].id as string;
		const removed = await characterService.removeEquipment(char.id, itemId);
		expect(removed).not.toBeNull();
		expect(removed?.equipment).toHaveLength(0);
	});

	it("removeEquipment returns null for missing character", async () => {
		const result = await characterService.removeEquipment("nonexistent", "some-id");
		expect(result).toBeNull();
	});

	const inputWithSlots: CreateCharacter = {
		...validInput,
		spellSlots: [
			{ level: 1, used: 0, available: 4 },
			{ level: 2, used: 1, available: 3 },
			{ level: 3, used: 2, available: 2 },
		],
	};

	it("useSpellSlot increments used for given level", async () => {
		const char = await characterService.createCharacter(inputWithSlots);
		const updated = await characterService.useSpellSlot(char.id, 1);
		expect(updated).not.toBeNull();
		const slot = updated?.spellSlots.find((s) => s.level === 1);
		expect(slot?.used).toBe(1);
	});

	it("useSpellSlot throws if no slots available", async () => {
		const char = await characterService.createCharacter(inputWithSlots);
		await expect(characterService.useSpellSlot(char.id, 3)).rejects.toThrow(
			"No available spell slots at level 3",
		);
	});

	it("useSpellSlot returns null for missing character", async () => {
		const result = await characterService.useSpellSlot("nonexistent", 1);
		expect(result).toBeNull();
	});

	it("restoreSpellSlot decrements used for given level", async () => {
		const char = await characterService.createCharacter(inputWithSlots);
		const updated = await characterService.restoreSpellSlot(char.id, 2);
		expect(updated).not.toBeNull();
		const slot = updated?.spellSlots.find((s) => s.level === 2);
		expect(slot?.used).toBe(0);
	});

	it("restoreSpellSlot floors used at 0", async () => {
		const char = await characterService.createCharacter(inputWithSlots);
		const updated = await characterService.restoreSpellSlot(char.id, 1);
		const slot = updated?.spellSlots.find((s) => s.level === 1);
		expect(slot?.used).toBe(0);
	});

	it("restoreSpellSlot returns null for missing character", async () => {
		const result = await characterService.restoreSpellSlot("nonexistent", 1);
		expect(result).toBeNull();
	});

	it("longRest resets spell slots, temp HP, current HP, and concentration", async () => {
		const char = await characterService.createCharacter({
			...inputWithSlots,
			hp: { current: 12, max: 30, temp: 5 },
			concentration: true,
		});
		const updated = await characterService.longRest(char.id);
		expect(updated).not.toBeNull();
		expect(updated?.hp.current).toBe(30);
		expect(updated?.hp.temp).toBe(0);
		expect(updated?.concentration).toBe(false);
		for (const slot of updated?.spellSlots ?? []) {
			expect(slot.used).toBe(0);
		}
	});

	it("longRest returns null for missing character", async () => {
		const result = await characterService.longRest("nonexistent");
		expect(result).toBeNull();
	});
});
