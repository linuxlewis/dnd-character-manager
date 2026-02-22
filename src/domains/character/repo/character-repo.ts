/**
 * Character Repository — data access layer.
 *
 * May import from: types, config
 * Must NOT import from: service, runtime, ui
 *
 * Uses an in-memory store as a placeholder.
 */

import type { Character, CreateCharacter, UpdateCharacter } from "../types/index.js";

const store = new Map<string, Character>();

export const characterRepo = {
	async findAll(): Promise<Character[]> {
		return Array.from(store.values());
	},

	async findById(id: string): Promise<Character | null> {
		return store.get(id) ?? null;
	},

	async create(input: CreateCharacter): Promise<Character> {
		const now = new Date();
		const character: Character = {
			...input,
			id: crypto.randomUUID(),
			createdAt: now,
			updatedAt: now,
		};
		store.set(character.id, character);
		return character;
	},

	async update(id: string, input: UpdateCharacter): Promise<Character | null> {
		const existing = store.get(id);
		if (!existing) return null;
		const updated: Character = {
			...existing,
			...input,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		store.set(id, updated);
		return updated;
	},

	async delete(id: string): Promise<boolean> {
		return store.delete(id);
	},

	/** Clear all data — useful for tests. */
	async _clear(): Promise<void> {
		store.clear();
	},
};
