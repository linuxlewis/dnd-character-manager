import { describe, expect, it } from "vitest";
import { calculateRollTotal } from "../types/character-rolls.js";
import { SKILL_CONFIG } from "./character-attributes.js";
import { buildCharacterAttributes, buildRollReference } from "./character-rolls.js";

const scores = {
	strength: 10,
	dexterity: 10,
	constitution: 10,
	intelligence: 10,
	wisdom: 10,
	charisma: 10,
};

function input(overrides: Record<string, unknown> = {}) {
	return {
		level: 1,
		scores,
		savingThrowProficiencies: [],
		skillProficiencies: [],
		...overrides,
	};
}

function entry(reference: ReturnType<typeof buildRollReference>, id: string) {
	const result = reference.find((candidate) => candidate.id === id);
	if (!result) throw new Error(`Missing roll entry ${id}`);
	return result;
}

describe("buildRollReference", () => {
	it("constructs all six ability checks, 18 skills, six saves, initiative, and passive perception", () => {
		const reference = buildRollReference(input());

		expect(reference).toHaveLength(32);
		expect(reference.slice(0, 6).every((roll) => roll.category === "ability-check")).toBe(true);
		expect(reference.slice(6, 24).every((roll) => roll.category === "skill")).toBe(true);
		expect(reference.slice(24, 30).every((roll) => roll.category === "saving-throw")).toBe(true);
		expect(reference.slice(30).map((roll) => roll.id)).toEqual([
			"initiative",
			"passive-perception",
		]);
		expect(reference.map((roll) => roll.id)).toEqual([
			"ability-check-strength",
			"ability-check-dexterity",
			"ability-check-constitution",
			"ability-check-intelligence",
			"ability-check-wisdom",
			"ability-check-charisma",
			...SKILL_CONFIG.map((skill) => `skill-${skill.key}`),
			"saving-throw-strength",
			"saving-throw-dexterity",
			"saving-throw-constitution",
			"saving-throw-intelligence",
			"saving-throw-wisdom",
			"saving-throw-charisma",
			"initiative",
			"passive-perception",
		]);
	});

	it("calculates rank combinations and the example derived values", () => {
		const reference = buildRollReference(
			input({
				scores: { ...scores, dexterity: 16, wisdom: 14 },
				level: 1,
				savingThrowProficiencies: [{ key: "wisdom", rank: "proficient" }],
				skillProficiencies: [
					{ key: "stealth", rank: "expertise" },
					{ key: "perception", rank: "proficient" },
					{ key: "athletics", rank: "half" },
				],
			}),
		);

		expect(entry(reference, "skill-stealth")).toMatchObject({
			total: 7,
			proficiencyRank: "expertise",
			components: [
				{ type: "ability", label: "Dexterity", value: 3 },
				{ type: "proficiency", label: "Expertise", value: 4 },
			],
		});
		expect(entry(reference, "skill-perception")).toMatchObject({ total: 4 });
		expect(entry(reference, "saving-throw-wisdom")).toMatchObject({ total: 4 });
		expect(entry(reference, "initiative")).toMatchObject({ total: 3 });
		expect(entry(reference, "passive-perception")).toMatchObject({
			total: 14,
			components: [
				{ type: "base", value: 10 },
				{ type: "ability", label: "Wisdom", value: 2 },
				{ type: "proficiency", label: "Proficient", value: 2 },
			],
		});
		expect(entry(reference, "skill-athletics")).toMatchObject({ total: 1 });
	});

	it("keeps zero and negative components visible and avoids double signs", () => {
		const reference = buildRollReference(
			input({ scores: { ...scores, strength: 1, wisdom: 1 }, level: 1 }),
		);
		const strengthSave = entry(reference, "saving-throw-strength");
		const passive = entry(reference, "passive-perception");

		expect(strengthSave.total).toBe(-5);
		expect(strengthSave.components).toEqual([
			{ type: "ability", label: "Strength", value: -5 },
			{ type: "proficiency", label: "No proficiency", value: 0 },
		]);
		expect(passive.total).toBe(5);
		expect(passive.components).toEqual([
			{ type: "base", label: "Base", value: 10 },
			{ type: "ability", label: "Wisdom", value: -5 },
			{ type: "proficiency", label: "No proficiency", value: 0 },
		]);
		for (const roll of reference) {
			expect(calculateRollTotal(roll.components)).toBe(roll.total);
		}
	});

	it("changes proficiency-derived totals at the level boundary without changing ranks", () => {
		const selections = [{ key: "stealth", rank: "expertise" as const }];
		const levelFour = buildRollReference(input({ level: 4, skillProficiencies: selections }));
		const levelFive = buildRollReference(input({ level: 5, skillProficiencies: selections }));

		expect(entry(levelFour, "skill-stealth").total).toBe(4);
		expect(entry(levelFive, "skill-stealth").total).toBe(6);
		expect(entry(levelFive, "skill-stealth").proficiencyRank).toBe("expertise");
	});
});

describe("buildCharacterAttributes", () => {
	it("returns parsed derived modifiers, selections, and roll reference", () => {
		const attributes = buildCharacterAttributes(input({ level: 9 }));

		expect(attributes.modifiers).toEqual({
			strength: 0,
			dexterity: 0,
			constitution: 0,
			intelligence: 0,
			wisdom: 0,
			charisma: 0,
		});
		expect(attributes.proficiencyBonus).toBe(4);
		expect(attributes.skillProficiencies).toHaveLength(18);
		expect(attributes.skillProficiencies.every((skill) => skill.rank === "none")).toBe(true);
		expect(attributes.savingThrowProficiencies).toHaveLength(6);
		expect(attributes.savingThrowProficiencies.every((save) => save.rank === "none")).toBe(true);
		expect(attributes.rollReference).toHaveLength(32);
	});
});
