export const DND_5E_RACES = [
	"Dragonborn",
	"Dwarf",
	"Elf",
	"Gnome",
	"Half-Elf",
	"Half-Orc",
	"Halfling",
	"Human",
	"Tiefling",
] as const;

export const DND_5E_CLASSES = [
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

export type Dnd5eRace = (typeof DND_5E_RACES)[number];
export type Dnd5eClass = (typeof DND_5E_CLASSES)[number];
