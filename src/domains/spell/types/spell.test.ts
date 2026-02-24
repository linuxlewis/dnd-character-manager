import { describe, expect, it } from "vitest";
import { SrdSpellSchema } from "./spell.ts";

describe("SrdSpellSchema", () => {
	const validSpell = {
		index: "fireball",
		name: "Fireball",
		level: 3,
		school: "Evocation",
		casting_time: "1 action",
		range: "150 feet",
		duration: "Instantaneous",
		description: "A bright streak flashes from your pointing finger...",
		classes: ["Sorcerer", "Wizard"],
	};

	it("accepts a valid spell", () => {
		const result = SrdSpellSchema.parse(validSpell);
		expect(result.index).toBe("fireball");
		expect(result.classes).toEqual(["Sorcerer", "Wizard"]);
	});

	it("accepts a cantrip (level 0)", () => {
		const cantrip = { ...validSpell, level: 0 };
		expect(SrdSpellSchema.parse(cantrip).level).toBe(0);
	});

	it("accepts level 9 spells", () => {
		const spell = { ...validSpell, level: 9 };
		expect(SrdSpellSchema.parse(spell).level).toBe(9);
	});

	it("rejects level above 9", () => {
		expect(() => SrdSpellSchema.parse({ ...validSpell, level: 10 })).toThrow();
	});

	it("rejects negative level", () => {
		expect(() => SrdSpellSchema.parse({ ...validSpell, level: -1 })).toThrow();
	});

	it("rejects empty index", () => {
		expect(() => SrdSpellSchema.parse({ ...validSpell, index: "" })).toThrow();
	});

	it("rejects missing required fields", () => {
		expect(() => SrdSpellSchema.parse({ index: "test" })).toThrow();
	});

	it("accepts optional cached_at", () => {
		const withCachedAt = { ...validSpell, cached_at: "2026-01-01 00:00:00" };
		expect(SrdSpellSchema.parse(withCachedAt).cached_at).toBe("2026-01-01 00:00:00");
	});

	it("accepts empty classes array", () => {
		const spell = { ...validSpell, classes: [] };
		expect(SrdSpellSchema.parse(spell).classes).toEqual([]);
	});
});
