import { getDb } from "@providers/database/index.js";
import { and, desc, eq } from "drizzle-orm";
import type { Character, CreateCharacter } from "../types/index.js";
import { characterFromRow } from "./character-row.js";
import { characterTable } from "./character-table.js";

type Db = ReturnType<typeof getDb>;

export interface CreateCharacterRecord extends CreateCharacter {
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
			const [row] = await db
				.insert(characterTable)
				.values({
					userId: input.userId,
					name: input.name,
					characterClass: input.class,
					level: input.level,
				})
				.returning();

			if (!row) throw new Error("Character insert did not return a row.");
			return characterFromRow(row);
		},

		async findByIdForUser(input) {
			const [row] = await db
				.select()
				.from(characterTable)
				.where(and(eq(characterTable.id, input.id), eq(characterTable.userId, input.userId)))
				.limit(1);

			return row ? characterFromRow(row) : null;
		},

		async listByUser(userId) {
			const rows = await db
				.select()
				.from(characterTable)
				.where(eq(characterTable.userId, userId))
				.orderBy(desc(characterTable.createdAt));

			return rows.map(characterFromRow);
		},
	};
}
