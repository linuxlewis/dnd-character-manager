import { describe, expect, it } from "vitest";
import { buildCharacterAttributes } from "../config/index.js";
import {
	attributeDraftFromSaved,
	attributesEqual,
	normalizeAttributeDraft,
	rollMatchesCategory,
	rollMatchesSearch,
	validateAttributeDraft,
} from "./character-attributes-ui.js";

const saved = buildCharacterAttributes({
	level: 5,
	scores: {
		strength: 10,
		dexterity: 16,
		constitution: 10,
		intelligence: 10,
		wisdom: 8,
		charisma: 10,
	},
	savingThrowProficiencies: [{ key: "wisdom", rank: "proficient" }],
	skillProficiencies: [{ key: "stealth", rank: "expertise" }],
});

describe("character attributes UI helpers", () => {
	it("normalizes a complete draft and detects a no-op", () => {
		const draft = attributeDraftFromSaved(saved);
		const normalized = normalizeAttributeDraft(draft);

		expect(normalized).not.toBeNull();
		if (!normalized) throw new Error("Expected a valid normalized draft.");
		expect(attributesEqual(normalized, normalized)).toBe(true);
		expect(normalized.scores.dexterity).toBe(16);
		expect(normalized.skillProficiencies[3]).toEqual({ key: "stealth", rank: "expertise" });
	});

	it("reports adjacent score errors for empty, fractional, and out-of-range values", () => {
		const draft = attributeDraftFromSaved(saved);
		draft.scores.strength = "";
		draft.scores.dexterity = 10.5;
		draft.scores.wisdom = 31;

		expect(validateAttributeDraft(draft)).toEqual({
			"scores.strength": "Score must be a whole number from 1 to 30",
			"scores.dexterity": "Score must be a whole number from 1 to 30",
			"scores.wisdom": "Score must be a whole number from 1 to 30",
		});
	});

	it("filters rolls by category and searchable label or ability", () => {
		expect(rollMatchesCategory("skill", "checks")).toBe(true);
		expect(rollMatchesCategory("initiative", "saves")).toBe(false);
		expect(rollMatchesSearch("Stealth", "Dexterity", "dex")).toBe(true);
		expect(rollMatchesSearch("Stealth", "Dexterity", "arcana")).toBe(false);
	});
});
