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
	name: z.string().min(1).max(255),
	race: z.string().min(1).max(100),
	class: z.string().min(1).max(100),
	level: z.number().int().min(1).max(20),
	abilityScores: AbilityScoresSchema,
	hp: HpSchema,
	spellSlots: z.array(SpellSlotSchema).default([]),
	equipment: z.array(EquipmentItemSchema).default([]),
	skills: z
		.array(
			z.object({
				name: z.string(),
				abilityKey: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]),
				proficient: z.boolean(),
			}),
		)
		.default([]),
	armorClass: ArmorClassSchema.default({ base: 10, override: null }),
	savingThrowProficiencies: z.array(z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"])).default([]),
	notes: z.string().default(""),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type Character = z.infer<typeof CharacterSchema>;

export const CreateCharacterSchema = CharacterSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;

export const UpdateCharacterSchema = CreateCharacterSchema.partial();

export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
