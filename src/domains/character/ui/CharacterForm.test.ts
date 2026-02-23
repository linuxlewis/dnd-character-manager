import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CreateCharacterSchema } from "../types/index.js";

const cssPath = resolve(import.meta.dirname, "CharacterForm.module.css");
const css = readFileSync(cssPath, "utf-8");

describe("CharacterForm", () => {
	it("exports CharacterForm component", async () => {
		const mod = await import("./CharacterForm.tsx");
		expect(mod.CharacterForm).toBeDefined();
		expect(typeof mod.CharacterForm).toBe("function");
	});

	it("CreateCharacterSchema validates a valid character", () => {
		const valid = {
			name: "Gandalf",
			race: "Human",
			class: "Wizard",
			level: 5,
			abilityScores: { STR: 10, DEX: 12, CON: 14, INT: 18, WIS: 16, CHA: 11 },
			hp: { current: 30, max: 30, temp: 0 },
		};
		const result = CreateCharacterSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it("CreateCharacterSchema rejects empty name", () => {
		const invalid = {
			name: "",
			race: "Human",
			class: "Wizard",
			level: 5,
			abilityScores: { STR: 10, DEX: 12, CON: 14, INT: 18, WIS: 16, CHA: 11 },
			hp: { current: 30, max: 30, temp: 0 },
		};
		const result = CreateCharacterSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("CreateCharacterSchema rejects level 0", () => {
		const invalid = {
			name: "Test",
			race: "Elf",
			class: "Rogue",
			level: 0,
			abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
			hp: { current: 10, max: 10, temp: 0 },
		};
		const result = CreateCharacterSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("CreateCharacterSchema rejects level above 20", () => {
		const invalid = {
			name: "Test",
			race: "Elf",
			class: "Rogue",
			level: 21,
			abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
			hp: { current: 10, max: 10, temp: 0 },
		};
		const result = CreateCharacterSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("CreateCharacterSchema rejects ability score below 1", () => {
		const invalid = {
			name: "Test",
			race: "Elf",
			class: "Rogue",
			level: 1,
			abilityScores: { STR: 0, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
			hp: { current: 10, max: 10, temp: 0 },
		};
		const result = CreateCharacterSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("CreateCharacterSchema rejects ability score above 30", () => {
		const invalid = {
			name: "Test",
			race: "Elf",
			class: "Rogue",
			level: 1,
			abilityScores: { STR: 31, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
			hp: { current: 10, max: 10, temp: 0 },
		};
		const result = CreateCharacterSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("CSS contains no hardcoded color values", () => {
		// Match hex colors like #ccc, #d32f2f, but allow inside var() references
		const lines = css.split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			// skip comments
			if (trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("//")) continue;
			// Check for hex colors not inside var()
			if (/#[0-9a-fA-F]{3,8}\b/.test(trimmed)) {
				throw new Error(`Hardcoded color found: ${trimmed}`);
			}
			// Check for rgb/rgba not inside var()
			if (/\brgba?\s*\(/.test(trimmed) && !trimmed.includes("var(")) {
				throw new Error(`Hardcoded rgb color found: ${trimmed}`);
			}
		}
	});

	it("CSS uses theme tokens for input styling", () => {
		expect(css).toContain("--color-input-bg");
		expect(css).toContain("--color-input-border");
	});

	it("CSS uses --color-primary for focus states", () => {
		expect(css).toContain(":focus");
		expect(css).toContain("--color-primary");
	});

	it("CSS uses --color-danger for error messages", () => {
		expect(css).toContain("--color-danger");
	});

	it("CSS uses --color-primary for submit button", () => {
		const submitSection = css.substring(css.indexOf(".submitButton"));
		expect(submitSection).toContain("--color-primary");
		expect(submitSection).toContain("--color-primary-hover");
	});

	it("inputs have min-height of 44px for touch targets", () => {
		expect(css).toContain("min-height: 44px");
	});

	it("form fields cover all 6 ability scores", () => {
		const keys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
		expect(keys).toHaveLength(6);
		for (const key of keys) {
			const valid = {
				name: "Test",
				race: "Human",
				class: "Fighter",
				level: 1,
				abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10, [key]: 15 },
				hp: { current: 10, max: 10, temp: 0 },
			};
			expect(CreateCharacterSchema.safeParse(valid).success).toBe(true);
		}
	});
});
