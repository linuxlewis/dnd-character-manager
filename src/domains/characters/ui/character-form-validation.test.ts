import { describe, expect, it } from "vitest";
import {
	validateCharacterClass,
	validateCharacterLevel,
	validateCharacterName,
} from "./character-form-validation.js";

describe("create character validation", () => {
	it("validates names, class selection, and level range", () => {
		expect(validateCharacterName(" ")).toBe("Name is required");
		expect(validateCharacterName("x".repeat(121))).toBe("Name must be 120 characters or fewer");
		expect(validateCharacterName("Vera")).toBeNull();
		expect(validateCharacterClass("")).toBe("Class is required");
		expect(validateCharacterClass("Wizard")).toBeNull();
		expect(validateCharacterLevel(0)).toBe("Level must be a whole number from 1 to 20");
		expect(validateCharacterLevel(20)).toBeNull();
	});
});
