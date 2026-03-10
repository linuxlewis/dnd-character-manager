/**
 * Dice — pure types and functions for dice rolling.
 *
 * Foundation layer: no imports from other domain layers except types.
 */

import { z } from "zod";

export const DieTypeSchema = z.union([
	z.literal(4),
	z.literal(6),
	z.literal(8),
	z.literal(10),
	z.literal(12),
	z.literal(20),
	z.literal(100),
]);

export type DieType = z.infer<typeof DieTypeSchema>;

export const DICE_TYPES: readonly DieType[] = [4, 6, 8, 10, 12, 20, 100];

export const RollModeSchema = z.enum(["normal", "advantage", "disadvantage"]);
export type RollMode = z.infer<typeof RollModeSchema>;

export const DiceRollInputSchema = z.object({
	die: DieTypeSchema,
	modifier: z.number().int().default(0),
	mode: RollModeSchema.default("normal"),
	label: z.string().default(""),
});

export type DiceRollInput = z.infer<typeof DiceRollInputSchema>;

export interface DiceRollResult {
	die: DieType;
	rolls: number[];
	selectedRoll: number;
	modifier: number;
	total: number;
	mode: RollMode;
	label: string;
	isCrit: boolean;
	isFumble: boolean;
	timestamp: number;
}

/** Roll a single die with the given number of sides. */
export function rollSingleDie(sides: number, rng: () => number = Math.random): number {
	return Math.floor(rng() * sides) + 1;
}

/** Select the appropriate roll value based on the roll mode. */
export function selectRoll(rolls: number[], mode: RollMode): number {
	if (mode === "advantage") return Math.max(...rolls);
	if (mode === "disadvantage") return Math.min(...rolls);
	return rolls[0];
}

/** Execute a dice roll with modifier and advantage/disadvantage support. */
export function rollDice(input: DiceRollInput, rng: () => number = Math.random): DiceRollResult {
	const rollCount = input.mode === "normal" ? 1 : 2;
	const rolls = Array.from({ length: rollCount }, () => rollSingleDie(input.die, rng));
	const selectedRoll = selectRoll(rolls, input.mode);
	const total = selectedRoll + input.modifier;

	return {
		die: input.die,
		rolls,
		selectedRoll,
		modifier: input.modifier,
		total,
		mode: input.mode,
		label: input.label,
		isCrit: input.die === 20 && selectedRoll === 20,
		isFumble: input.die === 20 && selectedRoll === 1,
		timestamp: Date.now(),
	};
}

/** Format a modifier as a signed string (e.g. +3, -1). */
export function formatModifier(mod: number): string {
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Format a roll result as a human-readable string. */
export function formatRollResult(result: DiceRollResult): string {
	const parts: string[] = [`d${result.die}`];
	if (result.modifier !== 0) {
		parts.push(formatModifier(result.modifier));
	}
	parts.push(`= ${result.total}`);
	if (result.label) {
		return `${result.label}: ${parts.join(" ")}`;
	}
	return parts.join(" ");
}

export const MAX_ROLL_HISTORY = 20;
