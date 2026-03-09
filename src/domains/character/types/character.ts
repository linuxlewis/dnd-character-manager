/**
 * Character — core domain type for the character domain.
 *
 * This is the foundation layer. It imports nothing from other layers.
 * All other layers in this domain build on these types.
 */

import { z } from "zod";

const abilityScore = z.number().int().min(1).max(30);

export const AbilityScoresSchema = z.object({
	STR: abilityScore,
	DEX: abilityScore,
	CON: abilityScore,
	INT: abilityScore,
	WIS: abilityScore,
	CHA: abilityScore,
});

export type AbilityScores = z.infer<typeof AbilityScoresSchema>;
export const AbilityKeySchema = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
export type AbilityKey = z.infer<typeof AbilityKeySchema>;

/**
 * Calculate the ability modifier for a given ability score.
 * Formula: Math.floor((score - 10) / 2)
 */
export function getAbilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

export const HpSchema = z.object({
	current: z.number().int().min(0),
	max: z.number().int().min(1),
	temp: z.number().int().min(0),
});

export type Hp = z.infer<typeof HpSchema>;

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
			"A blinded creature can’t see and automatically fails any ability check that requires sight.",
		effects: [
			"Attack rolls against the creature have advantage.",
			"The creature’s attack rolls have disadvantage.",
		],
	},
	Charmed: {
		summary:
			"A charmed creature can’t attack the charmer or target the charmer with harmful abilities or magical effects.",
		effects: [
			"The charmer has advantage on any ability check to interact socially with the creature.",
		],
	},
	Deafened: {
		summary: "A deafened creature can’t hear.",
		effects: [],
	},
	Frightened: {
		summary:
			"A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.",
		effects: ["The creature can’t willingly move closer to the source of its fear."],
	},
	Grappled: {
		summary:
			"A grappled creature’s speed becomes 0, and it can’t benefit from any bonus to its speed.",
		effects: [
			"The condition ends if the grappler is incapacitated.",
			"The condition also ends if an effect removes the creature from the grappler’s reach.",
		],
	},
	Incapacitated: {
		summary: "An incapacitated creature can’t take actions or reactions.",
		effects: [],
	},
	Invisible: {
		summary:
			"An invisible creature is impossible to see without the aid of magic or a special sense.",
		effects: [
			"For the purpose of hiding, the creature is heavily obscured.",
			"The creature’s location can be detected by any noise it makes or tracks it leaves.",
			"Attack rolls against the creature have disadvantage, and the creature’s attack rolls have advantage.",
		],
	},
	Paralyzed: {
		summary: "A paralyzed creature is incapacitated and can’t move or speak.",
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
			"The creature is incapacitated, can’t move or speak, and is unaware of its surroundings.",
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
			"A prone creature’s only movement option is to crawl, unless it stands up and thereby ends the condition.",
		effects: [
			"The creature has disadvantage on attack rolls.",
			"An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.",
		],
	},
	Restrained: {
		summary:
			"A restrained creature’s speed becomes 0, and it can’t benefit from any bonus to its speed.",
		effects: [
			"Attack rolls against the creature have advantage.",
			"The creature’s attack rolls have disadvantage.",
			"The creature has disadvantage on Dexterity saving throws.",
		],
	},
	Stunned: {
		summary: "A stunned creature is incapacitated, can’t move, and can speak only falteringly.",
		effects: [
			"The creature automatically fails Strength and Dexterity saving throws.",
			"Attack rolls against the creature have advantage.",
		],
	},
	Unconscious: {
		summary:
			"An unconscious creature is incapacitated, can’t move or speak, and is unaware of its surroundings.",
		effects: [
			"The creature drops whatever it’s holding and falls prone.",
			"The creature automatically fails Strength and Dexterity saving throws.",
			"Attack rolls against the creature have advantage.",
			"Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
		],
	},
};

/**
 * Apply damage to HP. Temp HP absorbs damage first, then current HP.
 * Current HP floors at 0.
 */
export function applyDamage(hp: Hp, damage: number): Hp {
	if (damage <= 0) return hp;
	let remaining = damage;
	let temp = hp.temp;
	let current = hp.current;

	if (temp > 0) {
		if (remaining >= temp) {
			remaining -= temp;
			temp = 0;
		} else {
			temp -= remaining;
			remaining = 0;
		}
	}

	current = Math.max(0, current - remaining);
	return { current, max: hp.max, temp };
}

/**
 * Apply healing to HP. Current HP caps at max HP. Temp HP is unaffected.
 */
export function applyHealing(hp: Hp, healing: number): Hp {
	if (healing <= 0) return hp;
	return {
		current: Math.min(hp.max, hp.current + healing),
		max: hp.max,
		temp: hp.temp,
	};
}

export function setTempHp(hp: Hp, temp: number): Hp {
	return {
		...hp,
		temp: Math.max(0, Math.floor(temp)),
	};
}

export function setMaxHp(hp: Hp, max: number): Hp {
	const nextMax = Math.max(1, Math.floor(max));
	return {
		current: Math.min(hp.current, nextMax),
		max: nextMax,
		temp: hp.temp,
	};
}

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

export const SpellSlotSchema = z
	.object({
		level: z.number().int().min(1).max(9),
		used: z.number().int().min(0),
		available: z.number().int().min(0),
	})
	.refine((data) => data.used <= data.available, {
		message: "used must be <= available",
	});

export type SpellSlot = z.infer<typeof SpellSlotSchema>;

export const EquipmentItemSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	quantity: z.number().int().min(1),
	weight: z.number().min(0),
	equipped: z.boolean(),
});

export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;

/**
 * Calculate the total weight of equipment (weight * quantity for each item).
 */
export function calculateTotalWeight(equipment: EquipmentItem[]): number {
	return equipment.reduce((sum, item) => sum + item.weight * item.quantity, 0);
}

export const ArmorClassSchema = z.object({
	base: z.number().default(10),
	override: z.number().nullable().default(null),
});

export type ArmorClass = z.infer<typeof ArmorClassSchema>;

/**
 * Calculate AC. If override is set, return override. Otherwise return base + DEX modifier.
 */
export function calculateAC(
	dexScore: number,
	armorClass: { base: number; override: number | null },
): number {
	if (armorClass.override !== null) return armorClass.override;
	return armorClass.base + getAbilityModifier(dexScore);
}

export const CharacterSchema = z.object({
	id: z.string().uuid(),
	slug: z.string().min(1).nullable(),
	name: z.string().min(1).max(255),
	race: z.string().min(1).max(100),
	class: z.string().min(1).max(100),
	level: z.number().int().min(1).max(20),
	abilityScores: AbilityScoresSchema,
	hp: HpSchema,
	conditions: z.array(CharacterConditionSchema).default([]),
	concentration: z.boolean().default(false),
	spellSlots: z.array(SpellSlotSchema).default([]),
	equipment: z.array(EquipmentItemSchema).default([]),
	skills: z
		.array(
			z.object({
				name: z.string(),
				abilityKey: AbilityKeySchema,
				proficient: z.boolean(),
			}),
		)
		.default([]),
	armorClass: ArmorClassSchema.default({ base: 10, override: null }),
	savingThrowProficiencies: z.array(AbilityKeySchema).default([]),
	notes: z.string().default(""),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type Character = z.infer<typeof CharacterSchema>;

export const CreateCharacterSchema = CharacterSchema.omit({
	id: true,
	slug: true,
	createdAt: true,
	updatedAt: true,
});

export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;

export const UpdateCharacterSchema = CreateCharacterSchema.partial();

export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
