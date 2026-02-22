import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@providers/db/schema.js";
import type { CreateCharacter } from "../types/index.js";
import { characterRepo, _setDb, _resetDb } from "./character-repo.js";

const validInput: CreateCharacter = {
	name: "Gandalf",
	race: "Human",
	class: "Wizard",
	level: 20,
	abilityScores: { STR: 10, DEX: 14, CON: 12, INT: 20, WIS: 18, CHA: 16 },
	hp: { current: 100, max: 100, temp: 0 },
	spellSlots: [{ level: 1, used: 0, available: 4 }],
	equipment: [{ id: crypto.randomUUID(), name: "Staff", quantity: 1, weight: 4, equipped: true }],
	skills: [{ name: "Arcana", abilityKey: "INT" as const, proficient: true }],
	notes: "A wizard is never late.",
};

describe("characterRepo (SQLite)", () => {
	let sqlite: InstanceType<typeof Database>;

	beforeAll(() => {
		sqlite = new Database(":memory:");
		sqlite.pragma("journal_mode = WAL");
		// Create the characters table
		sqlite.exec(`
			CREATE TABLE characters (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				race TEXT NOT NULL,
				class TEXT NOT NULL,
				level INTEGER NOT NULL DEFAULT 1,
				ability_scores TEXT,
				hp TEXT,
				spell_slots TEXT,
				equipment TEXT,
				skills TEXT,
				notes TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);
		const db = drizzle(sqlite, { schema });
		_setDb(db);
	});

	afterAll(() => {
		_resetDb();
		sqlite.close();
	});

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
		await new Promise((r) => setTimeout(r, 5));
		const updated = await characterRepo.update(char.id, { name: "Saruman", level: 18 });
		expect(updated).not.toBeNull();
		expect(updated?.name).toBe("Saruman");
		expect(updated?.level).toBe(18);
		expect(updated?.race).toBe("Human");
		expect(updated?.id).toBe(char.id);
		expect(updated?.createdAt).toEqual(char.createdAt);
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

	it("JSON fields round-trip correctly", async () => {
		const char = await characterRepo.create(validInput);
		const found = await characterRepo.findById(char.id);
		expect(found?.abilityScores).toEqual(validInput.abilityScores);
		expect(found?.hp).toEqual(validInput.hp);
		expect(found?.spellSlots).toEqual(validInput.spellSlots);
		expect(found?.equipment).toEqual(validInput.equipment);
		expect(found?.skills).toEqual(validInput.skills);
		expect(found?.notes).toBe(validInput.notes);
	});

	it("_clear deletes all rows", async () => {
		await characterRepo.create(validInput);
		await characterRepo.create({ ...validInput, name: "Frodo" });
		await characterRepo._clear();
		expect(await characterRepo.findAll()).toEqual([]);
	});
});
