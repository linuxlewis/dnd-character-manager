/**
 * Character Repository — data access layer backed by SQLite via Drizzle.
 *
 * May import from: types, config, providers
 * Must NOT import from: service, runtime, ui
 */

import { eq } from "drizzle-orm";
import { getDb } from "@providers/db/index.js";
import { characters } from "@providers/db/schema.js";
import type { Character, CreateCharacter, UpdateCharacter } from "../types/index.js";

/** Map a DB row to the domain Character type. */
function toDomain(row: typeof characters.$inferSelect): Character {
	return {
		id: row.id,
		name: row.name,
		race: row.race,
		class: row.class,
		level: row.level,
		abilityScores: row.ability_scores as Character["abilityScores"],
		hp: row.hp as Character["hp"],
		spellSlots: (row.spell_slots ?? []) as Character["spellSlots"],
		equipment: (row.equipment ?? []) as Character["equipment"],
		skills: (row.skills ?? []) as Character["skills"],
		notes: row.notes ?? "",
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
	};
}

export const characterRepo = {
	async findAll(): Promise<Character[]> {
		const db = getDb();
		const rows = await db.select().from(characters);
		return rows.map(toDomain);
	},

	async findById(id: string): Promise<Character | null> {
		const db = getDb();
		const rows = await db.select().from(characters).where(eq(characters.id, id));
		return rows.length > 0 ? toDomain(rows[0]) : null;
	},

	async create(input: CreateCharacter): Promise<Character> {
		const db = getDb();
		const now = new Date();
		const id = crypto.randomUUID();
		const row = {
			id,
			name: input.name,
			race: input.race,
			class: input.class,
			level: input.level,
			ability_scores: input.abilityScores as any,
			hp: input.hp as any,
			spell_slots: input.spellSlots as any,
			equipment: input.equipment as any,
			skills: input.skills as any,
			notes: input.notes ?? "",
			created_at: now.toISOString(),
			updated_at: now.toISOString(),
		};
		db.insert(characters).values(row).run();
		return {
			...input,
			id,
			createdAt: now,
			updatedAt: now,
		};
	},

	async update(id: string, input: UpdateCharacter): Promise<Character | null> {
		const existing = await this.findById(id);
		if (!existing) return null;

		const db = getDb();
		const now = new Date();
		const merged: Character = {
			...existing,
			...input,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: now,
		};

		const values: Record<string, any> = { updated_at: now.toISOString() };
		if (input.name !== undefined) values.name = input.name;
		if (input.race !== undefined) values.race = input.race;
		if (input.class !== undefined) values.class = input.class;
		if (input.level !== undefined) values.level = input.level;
		if (input.abilityScores !== undefined) values.ability_scores = input.abilityScores;
		if (input.hp !== undefined) values.hp = input.hp;
		if (input.spellSlots !== undefined) values.spell_slots = input.spellSlots;
		if (input.equipment !== undefined) values.equipment = input.equipment;
		if (input.skills !== undefined) values.skills = input.skills;
		if (input.notes !== undefined) values.notes = input.notes;

		db.update(characters).set(values).where(eq(characters.id, id)).run();

		return merged;
	},

	async delete(id: string): Promise<boolean> {
		const db = getDb();
		const result = db.delete(characters).where(eq(characters.id, id)).run();
		return result.changes > 0;
	},

	/** Clear all data — useful for tests. */
	async _clear(): Promise<void> {
		const db = getDb();
		db.delete(characters).run();
	},
};
