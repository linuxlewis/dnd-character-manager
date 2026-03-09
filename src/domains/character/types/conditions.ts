/**
 * Character conditions — SRD status effects and related utilities.
 *
 * This is part of the types foundation layer.
 */

import { z } from "zod";

export const CharacterConditionNameSchema = z.enum([
	"Blinded",
	"Charmed",
	"Deafened",
	"Frightened",
	"Grappled",
	"Incapacitated",
	"Invisible",
	"Paralyzed",
	"Petrified",
	"Poisoned",
	"Prone",
	"Restrained",
	"Stunned",
	"Unconscious",
]);

export type CharacterConditionName = z.infer<typeof CharacterConditionNameSchema>;

export const CharacterConditionSchema = z.object({
	name: CharacterConditionNameSchema,
	durationRounds: z.number().int().min(1).nullable().default(null),
});

export type CharacterCondition = z.infer<typeof CharacterConditionSchema>;

export const CONDITION_DETAILS: Record<
	CharacterConditionName,
	{ summary: string; effects: string[] }
> = {
	Blinded: {
		summary:
			"A blinded creature can't see and automatically fails any ability check that requires sight.",
		effects: [
			"Attack rolls against the creature have advantage.",
			"The creature's attack rolls have disadvantage.",
		],
	},
	Charmed: {
		summary:
			"A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
		effects: [
			"The charmer has advantage on any ability check to interact socially with the creature.",
		],
	},
	Deafened: {
		summary: "A deafened creature can't hear.",
		effects: [],
	},
	Frightened: {
		summary:
			"A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.",
		effects: ["The creature can't willingly move closer to the source of its fear."],
	},
	Grappled: {
		summary:
			"A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
		effects: [
			"The condition ends if the grappler is incapacitated.",
			"The condition also ends if an effect removes the creature from the grappler's reach.",
		],
	},
	Incapacitated: {
		summary: "An incapacitated creature can't take actions or reactions.",
		effects: [],
	},
	Invisible: {
		summary:
			"An invisible creature is impossible to see without the aid of magic or a special sense.",
		effects: [
			"For the purpose of hiding, the creature is heavily obscured.",
			"The creature's location can be detected by any noise it makes or tracks it leaves.",
			"Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage.",
		],
	},
	Paralyzed: {
		summary: "A paralyzed creature is incapacitated and can't move or speak.",
		effects: [
			"The creature automatically fails Strength and Dexterity saving throws.",
			"Attack rolls against the creature have advantage.",
			"Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
		],
	},
	Petrified: {
		summary:
			"A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance.",
		effects: [
			"Its weight increases by a factor of ten, and it ceases aging.",
			"The creature is incapacitated, can't move or speak, and is unaware of its surroundings.",
			"Attack rolls against the creature have advantage.",
			"The creature automatically fails Strength and Dexterity saving throws.",
			"The creature has resistance to all damage.",
			"The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.",
		],
	},
	Poisoned: {
		summary: "A poisoned creature has disadvantage on attack rolls and ability checks.",
		effects: [],
	},
	Prone: {
		summary:
			"A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.",
		effects: [
			"The creature has disadvantage on attack rolls.",
			"An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.",
		],
	},
	Restrained: {
		summary:
			"A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
		effects: [
			"Attack rolls against the creature have advantage.",
			"The creature's attack rolls have disadvantage.",
			"The creature has disadvantage on Dexterity saving throws.",
		],
	},
	Stunned: {
		summary: "A stunned creature is incapacitated, can't move, and can speak only falteringly.",
		effects: [
			"The creature automatically fails Strength and Dexterity saving throws.",
			"Attack rolls against the creature have advantage.",
		],
	},
	Unconscious: {
		summary:
			"An unconscious creature is incapacitated, can't move or speak, and is unaware of its surroundings.",
		effects: [
			"The creature drops whatever it's holding and falls prone.",
			"The creature automatically fails Strength and Dexterity saving throws.",
			"Attack rolls against the creature have advantage.",
			"Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
		],
	},
};

export function toggleCondition(
	conditions: CharacterCondition[],
	name: CharacterConditionName,
	durationRounds: number | null = null,
): CharacterCondition[] {
	const existing = conditions.find((condition) => condition.name === name);
	if (existing) {
		return conditions.filter((condition) => condition.name !== name);
	}

	return [
		...conditions,
		CharacterConditionSchema.parse({
			name,
			durationRounds,
		}),
	];
}
