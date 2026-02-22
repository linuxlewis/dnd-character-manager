/**
 * Character Repository — data access layer backed by SQLite via Drizzle.
 *
 * May import from: types, config, providers
 * Must NOT import from: service, runtime, ui
 */

import { eq } from "drizzle-orm";
import { getDb, characters, type AppDatabase } from "@providers/db/index.js";
import type { Character, CreateCharacter, UpdateCharacter } from "../types/index.js";

/** Convert a DB row to our domain Character type */
function toDomain(row: typeof characters.$inferSelect): Character {
	return {
		id: row.id,
		name: row.name,
		race: row.race,
		class: row.class,
		level: row.level,
		abilityScores: (row.ability_scores ?? { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }) as Character["abilityScores"],
		hp: (row.hp ?? { current: 1, max: 1, temp: 0 }) as Character["hp"],
		spellSlots: (row.spell_slots ?? []) as Character["spellSlots"],
		equipment: (row.equipment ?? []) as Character["equipment"],
		skills: (row.skills ?? []) as Character["skills"],
		notes: row.notes ?? "",
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
	};
}

/** Internal DB getter — can be overridden for tests */
let _getDb: () => AppDatabase = getDb;

export function _setDb(db: AppDatabase) {
	_getDb = () => db;
}

export function _resetDb() {
	_getDb = getDb;
}

export const characterRepo = {
	async findAll(): Promise<Character[]> {
		const db = _getDb();
		const rows = await db.select().from(characters);
		return rows.map(toDomain);
	},

	async findById(id: string): Promise<Character | null> {
		const db = _getDb();
		const rows = await db.select().from(characters).where(eq(characters.id, id));
		return rows.length > 0 ? toDomain(rows[0]) : null;
	},

	async create(input: CreateCharacter): Promise<Character> {
		const db = _getDb();
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
		return toDomain({ ...row });
	},

	async update(id: string, input: UpdateCharacter): Promise<Character | null> {
		const existing = await this.findById(id);
		if (!existing) return null;

		const now = new Date();
		const updates: Record<string, any> = { updated_at: now.toISOString() };

		if (input.name !== undefined) updates.name = input.name;
		if (input.race !== undefined) updates.race = input.race;
		if (input.class !== undefined) updates.class = input.class;
		if (input.level !== undefined) updates.level = input.level;
		if (input.abilityScores !== undefined) updates.ability_scores = input.abilityScores;
		if (input.hp !== undefined) updates.hp = input.hp;
		if (input.spellSlots !== undefined) updates.spell_slots = input.spellSlots;
		if (input.equipment !== undefined) updates.equipment = input.equipment;
		if (input.skills !== undefined) updates.skills = input.skills;
		if (input.notes !== undefined) updates.notes = input.notes;

		const db = _getDb();
		db.update(characters).set(updates).where(eq(characters.id, id)).run();

		return this.findById(id);
	},

	async delete(id: string): Promise<boolean> {
		const db = _getDb();
		const result = db.delete(characters).where(eq(characters.id, id)).run();
		return result.changes > 0;
	},

	async _clear(): Promise<void> {
		const db = _getDb();
		db.delete(characters).run();
	},
};
