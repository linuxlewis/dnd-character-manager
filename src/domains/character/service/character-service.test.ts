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

	it("gets a character by slug", async () => {
		const created = await characterService.createCharacter(validInput);
		expect(created.slug).toBeTruthy();
		const found = await characterService.getCharacterBySlug(created.slug);
		expect(found).not.toBeNull();
		expect(found?.id).toBe(created.id);
		expect(found?.name).toBe("Gandalf");
	});

	it("returns null for non-existent slug", async () => {
		const found = await characterService.getCharacterBySlug("no-such-slug-xxxx");
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

	// HP service methods (story-07)

	it("dealDamage reduces character HP and persists", async () => {
		const char = await characterService.createCharacter(validInput);
		const damaged = await characterService.dealDamage(char.id, 30);
		expect(damaged).not.toBeNull();
		expect(damaged?.hp.current).toBe(70);
		// Verify persisted
		const fetched = await characterService.getCharacter(char.id);
		expect(fetched?.hp.current).toBe(70);
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
		// Verify persisted
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

	// Skill toggle (story-08)

	it("toggleSkillProficiency flips proficient boolean", async () => {
		const char = await characterService.createCharacter({
			...validInput,
			skills: [{ name: "Stealth", abilityKey: "DEX", proficient: false }],
		});
		const toggled = await characterService.toggleSkillProficiency(char.id, "Stealth");
		expect(toggled).not.toBeNull();
		expect(toggled?.skills.find((s) => s.name === "Stealth")?.proficient).toBe(true);
		// Toggle back
		const toggled2 = await characterService.toggleSkillProficiency(char.id, "Stealth");
		expect(toggled2?.skills.find((s) => s.name === "Stealth")?.proficient).toBe(false);
	});

	it("toggleSkillProficiency returns null for missing character", async () => {
		const result = await characterService.toggleSkillProficiency("nonexistent", "Stealth");
		expect(result).toBeNull();
	});

	// Equipment service methods (story-08)

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

	// Spell slot service methods
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
		// level 3 has used=2, available=2 — already full
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
		// level 1 has used=0 already
		const updated = await characterService.restoreSpellSlot(char.id, 1);
		const slot = updated?.spellSlots.find((s) => s.level === 1);
		expect(slot?.used).toBe(0);
	});

	it("restoreSpellSlot returns null for missing character", async () => {
		const result = await characterService.restoreSpellSlot("nonexistent", 1);
		expect(result).toBeNull();
	});

	it("longRest resets all spell slots to used=0", async () => {
		const char = await characterService.createCharacter(inputWithSlots);
		const updated = await characterService.longRest(char.id);
		expect(updated).not.toBeNull();
		for (const slot of updated?.spellSlots ?? []) {
			expect(slot.used).toBe(0);
		}
	});

	it("longRest returns null for missing character", async () => {
		const result = await characterService.longRest("nonexistent");
		expect(result).toBeNull();
	});
});
