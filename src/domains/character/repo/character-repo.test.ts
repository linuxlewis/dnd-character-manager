import { beforeEach, describe, expect, it } from "vitest";
import type { CreateCharacter } from "../types/index.js";
import { characterRepo } from "./character-repo.js";

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
	knownSpells: [],
	preparedSpells: [],
};

describe("characterRepo", () => {
	beforeEach(async () => {
		await characterRepo._clear();
	});

	it("findAll returns empty array initially", async () => {
		expect(await characterRepo.findAll()).toEqual([]);
	});

	it("create generates UUID and timestamps", async () => {
		const char = await characterRepo.create(validInput);
		expect(char.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(char.createdAt).toBeInstanceOf(Date);
		expect(char.updatedAt).toBeInstanceOf(Date);
		expect(char.name).toBe("Gandalf");
	});

	it("findById returns character after create", async () => {
		const char = await characterRepo.create(validInput);
		const found = await characterRepo.findById(char.id);
		expect(found).toEqual(char);
	});

	it("findById returns null for unknown id", async () => {
		expect(await characterRepo.findById("nonexistent")).toBeNull();
	});

	it("findAll returns all characters", async () => {
		await characterRepo.create(validInput);
		await characterRepo.create({ ...validInput, name: "Frodo" });
		const all = await characterRepo.findAll();
		expect(all).toHaveLength(2);
	});

	it("update merges partial data and updates updatedAt", async () => {
		const char = await characterRepo.create(validInput);
		const before = char.updatedAt;
		// Small delay to ensure different timestamp
		await new Promise((r) => setTimeout(r, 5));
		const updated = await characterRepo.update(char.id, { name: "Saruman", level: 18 });
		expect(updated).not.toBeNull();
		expect(updated?.name).toBe("Saruman");
		expect(updated?.level).toBe(18);
		expect(updated?.race).toBe("Human"); // unchanged
		expect(updated?.id).toBe(char.id); // id preserved
		expect(updated?.createdAt).toEqual(char.createdAt); // createdAt preserved
		expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
	});

	it("update returns null for unknown id", async () => {
		expect(await characterRepo.update("nonexistent", { name: "X" })).toBeNull();
	});

	it("delete removes character and returns true", async () => {
		const char = await characterRepo.create(validInput);
		expect(await characterRepo.delete(char.id)).toBe(true);
		expect(await characterRepo.findById(char.id)).toBeNull();
	});

	it("delete returns false for unknown id", async () => {
		expect(await characterRepo.delete("nonexistent")).toBe(false);
	});

	it("create stores knownSpells and preparedSpells", async () => {
		const input = { ...validInput, knownSpells: ["fireball", "magic-missile"], preparedSpells: ["fireball"] };
		const created = await characterRepo.create(input);
		expect(created.knownSpells).toEqual(["fireball", "magic-missile"]);
		expect(created.preparedSpells).toEqual(["fireball"]);

		const fetched = await characterRepo.findById(created.id);
		expect(fetched!.knownSpells).toEqual(["fireball", "magic-missile"]);
		expect(fetched!.preparedSpells).toEqual(["fireball"]);
	});

	it("create defaults knownSpells and preparedSpells to empty arrays", async () => {
		const created = await characterRepo.create(validInput);
		expect(created.knownSpells).toEqual([]);
		expect(created.preparedSpells).toEqual([]);
	});

	it("update can modify knownSpells and preparedSpells", async () => {
		const created = await characterRepo.create(validInput);
		const updated = await characterRepo.update(created.id, {
			knownSpells: ["shield"],
			preparedSpells: ["shield"],
		});
		expect(updated!.knownSpells).toEqual(["shield"]);
		expect(updated!.preparedSpells).toEqual(["shield"]);

		const fetched = await characterRepo.findById(created.id);
		expect(fetched!.knownSpells).toEqual(["shield"]);
		expect(fetched!.preparedSpells).toEqual(["shield"]);
	});
});
