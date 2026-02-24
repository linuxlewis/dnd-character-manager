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

	it("create generates a slug from the character name", async () => {
		const char = await characterRepo.create(validInput);
		expect(char.slug).toBeDefined();
		expect(char.slug).toMatch(/^gandalf-[0-9a-f]{4}$/);
	});

	it("findBySlug returns character after create", async () => {
		const char = await characterRepo.create(validInput);
		const found = await characterRepo.findBySlug(char.slug);
		expect(found).not.toBeNull();
		expect(found?.id).toBe(char.id);
		expect(found?.slug).toBe(char.slug);
	});

	it("findBySlug returns null for unknown slug", async () => {
		expect(await characterRepo.findBySlug("nonexistent-slug")).toBeNull();
	});
});
