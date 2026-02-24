/**
 * Spell Repository — data access layer for cached SRD spells.
 *
 * May import from: types, config, providers
 * Must NOT import from: service, runtime, ui
 */

import { getDb } from "@providers/db/index.js";
import { srdSpells } from "@providers/db/schema.js";
import { and, eq, like } from "drizzle-orm";
import type { SrdSpell } from "../types/index.js";

/** Map a DB row to the domain SrdSpell type. */
function toDomain(row: typeof srdSpells.$inferSelect): SrdSpell {
	return {
		index: row.index,
		name: row.name,
		level: row.level,
		school: row.school,
		casting_time: row.casting_time,
		range: row.range,
		duration: row.duration,
		description: row.description,
		classes: row.classes as string[],
		cached_at: row.cached_at,
	};
}

export interface SpellSearchFilters {
	name?: string;
	level?: number;
	school?: string;
	className?: string;
}

export const spellRepo = {
	/** Bulk insert or update spells. */
	async upsertSpells(spells: SrdSpell[]): Promise<void> {
		const db = getDb();
		for (const spell of spells) {
			db.insert(srdSpells)
				.values({
					index: spell.index,
					name: spell.name,
					level: spell.level,
					school: spell.school,
					casting_time: spell.casting_time,
					range: spell.range,
					duration: spell.duration,
					description: spell.description,
					classes: spell.classes,
					cached_at: spell.cached_at ?? new Date().toISOString(),
				})
				.onConflictDoUpdate({
					target: srdSpells.index,
					set: {
						name: spell.name,
						level: spell.level,
						school: spell.school,
						casting_time: spell.casting_time,
						range: spell.range,
						duration: spell.duration,
						description: spell.description,
						classes: spell.classes,
						cached_at: spell.cached_at ?? new Date().toISOString(),
					},
				})
				.run();
		}
	},

	/** Get all cached spells. */
	async getAllSpells(): Promise<SrdSpell[]> {
		const db = getDb();
		const rows = await db.select().from(srdSpells);
		return rows.map(toDomain);
	},

	/** Get a single spell by its index (e.g. "fireball"). */
	async getSpellByIndex(index: string): Promise<SrdSpell | null> {
		const db = getDb();
		const rows = await db.select().from(srdSpells).where(eq(srdSpells.index, index));
		return rows.length > 0 ? toDomain(rows[0]) : null;
	},

	/** Search spells with optional filters. */
	async searchSpells(filters: SpellSearchFilters): Promise<SrdSpell[]> {
		const db = getDb();
		const conditions = [];

		if (filters.name !== undefined) {
			conditions.push(like(srdSpells.name, `%${filters.name}%`));
		}
		if (filters.level !== undefined) {
			conditions.push(eq(srdSpells.level, filters.level));
		}
		if (filters.school !== undefined) {
			conditions.push(eq(srdSpells.school, filters.school));
		}
		if (filters.className !== undefined) {
			conditions.push(like(srdSpells.classes, `%${filters.className}%`));
		}

		const query = conditions.length > 0
			? db.select().from(srdSpells).where(and(...conditions))
			: db.select().from(srdSpells);

		const rows = await query;
		return rows.map(toDomain);
	},

	/** Clear all cached spells. */
	async clearCache(): Promise<void> {
		const db = getDb();
		db.delete(srdSpells).run();
	},
};
