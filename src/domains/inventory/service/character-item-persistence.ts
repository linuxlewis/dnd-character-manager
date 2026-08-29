import { CharacterItemPersistenceError } from "./character-item-errors.js";

export async function repositoryCall<T>(operation: string, callback: () => Promise<T>): Promise<T> {
	try {
		return await callback();
	} catch (error) {
		if (error instanceof CharacterItemPersistenceError) throw error;
		throw new CharacterItemPersistenceError(`Character item ${operation} failed.`, error);
	}
}
