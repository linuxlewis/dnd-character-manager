import { describe, expect, it } from "vitest";
import { CHARACTER_CLASSES, CharacterClassSchema } from "./character-class.js";

describe("CharacterClassSchema", () => {
	it("accepts supported D&D character classes", () => {
		expect(CHARACTER_CLASSES).toContain("Fighter");
		expect(CharacterClassSchema.parse("Wizard")).toBe("Wizard");
	});

	it("rejects unsupported classes", () => {
		expect(() => CharacterClassSchema.parse("Commoner")).toThrow();
	});
});
