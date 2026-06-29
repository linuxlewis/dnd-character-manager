import { getDb } from "@providers/database/index.js";
import { and, desc, eq } from "drizzle-orm";
import type { Character, CreateCharacter } from "../types/index.js";
import { CharacterClassSchema } from "../types/index.js";
import type { CharacterRow } from "./character-row.js";
import { characterFromRow } from "./character-row.js";
import { characterHealthTable, charactersTable } from "./character-table.js";

type Db = ReturnType<typeof getDb>;

export interface CreateCharacterRecord extends CreateCharacter {
	maxHp?: number;
	userId: string;
}

export interface CharacterRepo {
	create(input: CreateCharacterRecord): Promise<Character>;
	findByIdForUser(input: { id: string; userId: string }): Promise<Character | null>;
	listByUser(userId: string): Promise<Character[]>;
}

export function createCharacterRepo(db: Db = getDb()): CharacterRepo {
	return {
		async create(input) {
			const row = await db.transaction(async (tx) => {
				const [created] = await tx
					.insert(charactersTable)
					.values({
						userId: input.userId,
						name: input.name,
						className: input.class,
						level: input.level,
					})
					.returning();

				if (!created) throw new Error("Character insert did not return a row.");

				const maxHp = input.maxHp ?? 1;
				await tx.insert(characterHealthTable).values({
					characterId: created.id,
					currentHp: maxHp,
					maxHp,
					temporaryHp: 0,
				});

				return created;
			});

			return characterFromTableRow(row);
		},

		async findByIdForUser(input) {
			const [row] = await db
				.select()
				.from(charactersTable)
				.where(and(eq(charactersTable.id, input.id), eq(charactersTable.userId, input.userId)))
				.limit(1);

			return row ? characterFromTableRow(row) : null;
		},

		async listByUser(userId) {
			const rows = await db
				.select()
				.from(charactersTable)
				.where(eq(charactersTable.userId, userId))
				.orderBy(desc(charactersTable.createdAt));

			return rows.map(characterFromTableRow);
		},
	};
}

function characterFromTableRow(row: typeof charactersTable.$inferSelect): Character {
	const characterRow: CharacterRow = {
		id: row.id,
		userId: row.userId,
		name: row.name,
		characterClass: CharacterClassSchema.parse(row.className),
		level: row.level,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
	return characterFromRow(characterRow);
}
