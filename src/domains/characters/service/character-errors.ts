export class CharacterNotFoundError extends Error {
	constructor() {
		super("Character not found.");
		this.name = "CharacterNotFoundError";
	}
}

export class SpellSlotUnavailableError extends Error {
	constructor(message = "Spell slot change is not available.") {
		super(message);
		this.name = "SpellSlotUnavailableError";
	}
}

export class SpellSlotDefaultsUnavailableError extends Error {
	constructor() {
		super("D&D spell slot defaults could not be loaded.");
		this.name = "SpellSlotDefaultsUnavailableError";
	}
}

export class SpellSearchUnavailableError extends Error {
	constructor() {
		super("D&D spells could not be loaded.");
		this.name = "SpellSearchUnavailableError";
	}
}
