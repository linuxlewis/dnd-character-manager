import { type Database, type DatabaseConnection, getDb } from "@providers/database/index.js";
import { and, asc, eq } from "drizzle-orm";
import { findOwnedCharacter, lockOwnedCharacter } from "../../characters/access/index.js";
import { assertSpellCanSaveToBucket } from "../config/index.js";
import { characterSpellsTable } from "../schema/index.js";
import type { CharacterSpell, CharacterSpellsResponse } from "../types/index.js";
import { CharacterSpellsResponseSchema } from "../types/index.js";
import { toCharacterSpell } from "./character-mappers.js";

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
	removeCharacterSpell(
		userId: string,
		characterId: string,
		spellId: string,
	): Promise<CharacterSpellsResponse | null>;
}

export function createCharacterSpellRepository(
	database: () => Database = getDb,
): CharacterSpellRepository {
	return {
		async characterExists(userId, characterId) {
			return Boolean(await findOwnedCharacter(userId, characterId, database()));
		},

		async getCharacterSpell(userId, characterId, spellId) {
			if (!(await this.characterExists(userId, characterId))) return null;

			const [row] = await database()
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

			return listSpells(database(), characterId);
		},

		async saveCharacterSpell(userId, characterId, spell) {
			return database().transaction(async (tx) => {
				if (!(await lockOwnedCharacter(userId, characterId, tx))) return null;
				assertSpellCanSaveToBucket(spell, spell.slotLevel);

				await tx
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

				const spells = await listSpells(tx, characterId);
				return CharacterSpellsResponseSchema.parse({ spells });
			});
		},

		async removeCharacterSpell(userId, characterId, spellId) {
			return database().transaction(async (tx) => {
				if (!(await lockOwnedCharacter(userId, characterId, tx))) return null;

				await tx
					.delete(characterSpellsTable)
					.where(
						and(
							eq(characterSpellsTable.characterId, characterId),
							eq(characterSpellsTable.id, spellId),
						),
					);

				const spells = await listSpells(tx, characterId);
				return CharacterSpellsResponseSchema.parse({ spells });
			});
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

async function listSpells(connection: DatabaseConnection, characterId: string) {
	const rows = await connection
		.select(characterSpellColumns())
		.from(characterSpellsTable)
		.where(eq(characterSpellsTable.characterId, characterId))
		.orderBy(
			asc(characterSpellsTable.slotLevel),
			asc(characterSpellsTable.spellLevel),
			asc(characterSpellsTable.spellName),
		);

	return rows.map(toCharacterSpell);
}
