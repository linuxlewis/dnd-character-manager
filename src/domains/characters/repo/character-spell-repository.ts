import { getDb } from "@providers/database/index.js";
import { and, asc, eq } from "drizzle-orm";
import type { CharacterSpell, CharacterSpellsResponse } from "../types/index.js";
import { CharacterSpellsResponseSchema } from "../types/index.js";
import { toCharacterSpell } from "./character-mappers.js";
import { characterSpellsTable, charactersTable } from "./character-table.js";

export interface NewCharacterSpell {
	slotLevel: number;
	source: "feature" | "spell";
	spellIndex: string;
	name: string;
	level: number;
	url: string;
}

export interface CharacterSpellRepository {
	characterExists(userId: string, characterId: string): Promise<boolean>;
	getCharacterSpell(
		userId: string,
		characterId: string,
		spellId: string,
	): Promise<CharacterSpell | null>;
	listCharacterSpells(userId: string, characterId: string): Promise<CharacterSpell[] | null>;
	saveCharacterSpell(
		userId: string,
		characterId: string,
		spell: NewCharacterSpell,
	): Promise<CharacterSpellsResponse | null>;
}

export function createCharacterSpellRepository(): CharacterSpellRepository {
	return {
		async characterExists(userId, characterId) {
			const [owned] = await getDb()
				.select({ id: charactersTable.id })
				.from(charactersTable)
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.limit(1);

			return Boolean(owned);
		},

		async getCharacterSpell(userId, characterId, spellId) {
			if (!(await this.characterExists(userId, characterId))) return null;

			const [row] = await getDb()
				.select(characterSpellColumns())
				.from(characterSpellsTable)
				.where(
					and(
						eq(characterSpellsTable.characterId, characterId),
						eq(characterSpellsTable.id, spellId),
					),
				)
				.limit(1);

			return row ? toCharacterSpell(row) : null;
		},

		async listCharacterSpells(userId, characterId) {
			if (!(await this.characterExists(userId, characterId))) return null;

			const rows = await getDb()
				.select(characterSpellColumns())
				.from(characterSpellsTable)
				.where(eq(characterSpellsTable.characterId, characterId))
				.orderBy(
					asc(characterSpellsTable.slotLevel),
					asc(characterSpellsTable.spellLevel),
					asc(characterSpellsTable.spellName),
				);

			return rows.map(toCharacterSpell);
		},

		async saveCharacterSpell(userId, characterId, spell) {
			if (!(await this.characterExists(userId, characterId))) return null;

			await getDb()
				.insert(characterSpellsTable)
				.values({
					characterId,
					slotLevel: spell.slotLevel,
					spellSource: spell.source,
					spellIndex: spell.spellIndex,
					spellName: spell.name,
					spellLevel: spell.level,
					spellUrl: spell.url,
				})
				.onConflictDoNothing({
					target: [
						characterSpellsTable.characterId,
						characterSpellsTable.slotLevel,
						characterSpellsTable.spellSource,
						characterSpellsTable.spellIndex,
					],
				});

			const spells = await this.listCharacterSpells(userId, characterId);
			if (!spells) return null;
			return CharacterSpellsResponseSchema.parse({ spells });
		},
	};
}

function characterSpellColumns() {
	return {
		id: characterSpellsTable.id,
		slotLevel: characterSpellsTable.slotLevel,
		spellSource: characterSpellsTable.spellSource,
		spellIndex: characterSpellsTable.spellIndex,
		spellName: characterSpellsTable.spellName,
		spellLevel: characterSpellsTable.spellLevel,
		spellUrl: characterSpellsTable.spellUrl,
	};
}
