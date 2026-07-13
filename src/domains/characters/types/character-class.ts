import { z } from "zod";

export const CHARACTER_CLASSES = [
	"Barbarian",
	"Bard",
	"Cleric",
	"Druid",
	"Fighter",
	"Monk",
	"Paladin",
	"Ranger",
	"Rogue",
	"Sorcerer",
	"Warlock",
	"Wizard",
] as const;

export const CharacterClassSchema = z.enum(CHARACTER_CLASSES);
export type CharacterClass = z.infer<typeof CharacterClassSchema>;
