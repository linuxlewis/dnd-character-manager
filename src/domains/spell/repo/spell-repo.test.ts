import { describe, it, expect, beforeEach } from "vitest";
import { spellRepo } from "./spell-repo.js";
import type { SrdSpell } from "../types/index.js";

const makeSpell = (overrides: Partial<SrdSpell> = {}): SrdSpell => ({
	index: "fireball",
	name: "Fireball",
	level: 3,
	school: "Evocation",
	casting_time: "1 action",
	range: "150 feet",
	duration: "Instantaneous",
	description: "A bright streak flashes...",
	classes: ["Sorcerer", "Wizard"],
	cached_at: "2026-01-01T00:00:00.000Z",
	...overrides,
});

describe("spellRepo", () => {
	beforeEach(async () => {
		await spellRepo.clearCache();
	});

	it("upsertSpells inserts new spells", async () => {
		await spellRepo.upsertSpells([makeSpell()]);
		const all = await spellRepo.getAllSpells();
		expect(all).toHaveLength(1);
		expect(all[0].name).toBe("Fireball");
	});

	it("upsertSpells updates existing spells", async () => {
		await spellRepo.upsertSpells([makeSpell()]);
		await spellRepo.upsertSpells([makeSpell({ name: "Fireball Updated" })]);
		const all = await spellRepo.getAllSpells();
		expect(all).toHaveLength(1);
		expect(all[0].name).toBe("Fireball Updated");
	});

	it("upsertSpells handles bulk insert", async () => {
		const spells = [
			makeSpell({ index: "fireball", name: "Fireball" }),
			makeSpell({ index: "magic-missile", name: "Magic Missile", level: 1 }),
			makeSpell({ index: "cure-wounds", name: "Cure Wounds", level: 1, school: "Evocation", classes: ["Bard", "Cleric"] }),
		];
		await spellRepo.upsertSpells(spells);
		const all = await spellRepo.getAllSpells();
		expect(all).toHaveLength(3);
	});

	it("getSpellByIndex returns spell when found", async () => {
		await spellRepo.upsertSpells([makeSpell()]);
		const spell = await spellRepo.getSpellByIndex("fireball");
		expect(spell).not.toBeNull();
		expect(spell!.name).toBe("Fireball");
		expect(spell!.classes).toEqual(["Sorcerer", "Wizard"]);
	});

	it("getSpellByIndex returns null when not found", async () => {
		const spell = await spellRepo.getSpellByIndex("nonexistent");
		expect(spell).toBeNull();
	});

	it("searchSpells filters by name (LIKE)", async () => {
		await spellRepo.upsertSpells([
			makeSpell({ index: "fireball", name: "Fireball" }),
			makeSpell({ index: "fire-bolt", name: "Fire Bolt", level: 0 }),
			makeSpell({ index: "magic-missile", name: "Magic Missile", level: 1 }),
		]);
		const results = await spellRepo.searchSpells({ name: "Fire" });
		expect(results).toHaveLength(2);
	});

	it("searchSpells filters by level", async () => {
		await spellRepo.upsertSpells([
			makeSpell({ index: "fireball", name: "Fireball", level: 3 }),
			makeSpell({ index: "magic-missile", name: "Magic Missile", level: 1 }),
		]);
		const results = await spellRepo.searchSpells({ level: 3 });
		expect(results).toHaveLength(1);
		expect(results[0].index).toBe("fireball");
	});

	it("searchSpells filters by school", async () => {
		await spellRepo.upsertSpells([
			makeSpell({ index: "fireball", school: "Evocation" }),
			makeSpell({ index: "charm-person", name: "Charm Person", school: "Enchantment", level: 1 }),
		]);
		const results = await spellRepo.searchSpells({ school: "Enchantment" });
		expect(results).toHaveLength(1);
		expect(results[0].index).toBe("charm-person");
	});

	it("searchSpells filters by className (JSON contains)", async () => {
		await spellRepo.upsertSpells([
			makeSpell({ index: "fireball", classes: ["Sorcerer", "Wizard"] }),
			makeSpell({ index: "cure-wounds", name: "Cure Wounds", level: 1, classes: ["Bard", "Cleric"] }),
		]);
		const results = await spellRepo.searchSpells({ className: "Cleric" });
		expect(results).toHaveLength(1);
		expect(results[0].index).toBe("cure-wounds");
	});

	it("searchSpells combines multiple filters", async () => {
		await spellRepo.upsertSpells([
			makeSpell({ index: "fireball", level: 3, school: "Evocation", classes: ["Wizard"] }),
			makeSpell({ index: "lightning-bolt", name: "Lightning Bolt", level: 3, school: "Evocation", classes: ["Wizard"] }),
			makeSpell({ index: "charm-person", name: "Charm Person", level: 1, school: "Enchantment", classes: ["Wizard"] }),
		]);
		const results = await spellRepo.searchSpells({ level: 3, school: "Evocation" });
		expect(results).toHaveLength(2);
	});

	it("searchSpells returns all when no filters", async () => {
		await spellRepo.upsertSpells([makeSpell(), makeSpell({ index: "other", name: "Other" })]);
		const results = await spellRepo.searchSpells({});
		expect(results).toHaveLength(2);
	});

	it("clearCache removes all spells", async () => {
		await spellRepo.upsertSpells([makeSpell()]);
		await spellRepo.clearCache();
		const all = await spellRepo.getAllSpells();
		expect(all).toHaveLength(0);
	});
});
