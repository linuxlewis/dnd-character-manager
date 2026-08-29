export class CharacterItemNotFoundError extends Error {
	constructor() {
		super("Character item not found.");
		this.name = "CharacterItemNotFoundError";
	}
}

export class CatalogueItemNotFoundError extends Error {
	constructor() {
		super("Catalogue item not found.");
		this.name = "CatalogueItemNotFoundError";
	}
}

export class CatalogueItemUnavailableError extends Error {
	constructor() {
		super("Catalogue item data is unavailable.");
		this.name = "CatalogueItemUnavailableError";
	}
}

export class CatalogueItemClientUnavailableError extends Error {
	constructor() {
		super("Catalogue item data is unavailable.");
		this.name = "CatalogueItemClientUnavailableError";
	}
}

export class CharacterItemPersistenceError extends Error {
	readonly cause: unknown;

	constructor(message = "Character item persistence failed.", cause?: unknown) {
		super(message, { cause });
		this.name = "CharacterItemPersistenceError";
		this.cause = cause;
	}
}
