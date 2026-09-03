export class CharacterHistoryPersistenceError extends Error {
	readonly cause: unknown;

	constructor(message = "Character history persistence failed.", cause?: unknown) {
		super(message, { cause });
		this.name = "CharacterHistoryPersistenceError";
		this.cause = cause;
	}
}
