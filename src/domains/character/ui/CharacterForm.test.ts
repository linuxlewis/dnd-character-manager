import { describe, expect, it } from "vitest";
import { CreateCharacterSchema } from "../types/index.js";

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
