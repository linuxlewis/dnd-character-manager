export class CharacterNotFoundError extends Error {
	constructor() {
		super("Character not found.");
		this.name = "CharacterNotFoundError";
	}
}
