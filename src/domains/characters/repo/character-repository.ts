import type { DatabaseTransaction } from "@providers/database/index.js";
import { getDb } from "@providers/database/index.js";
import { and, asc, eq } from "drizzle-orm";
import { charactersTable } from "../schema/index.js";
import type { CharacterSummary } from "../types/index.js";
import { CharacterIdSchema } from "../types/index.js";
import { toCharacterSummary } from "./character-mappers.js";

export interface CharacterRepository {
	listCharacters(userId: string): Promise<CharacterSummary[]>;
	transferCharactersToUser(fromUserId: string, toUserId: string): Promise<number>;
	updateCharacterLevel(userId: string, characterId: string, level: number): Promise<string | null>;
	updateCharacterName(userId: string, characterId: string, name: string): Promise<string | null>;
	updateCharacterExperience(
		userId: string,
		characterId: string,
		experiencePoints: number,
	): Promise<string | null>;
}

export function createCharacterRepository(): CharacterRepository {
	return {
		async listCharacters(userId) {
			const rows = await getDb()
				.select({
					id: charactersTable.id,
					name: charactersTable.name,
					className: charactersTable.className,
					level: charactersTable.level,
				})
				.from(charactersTable)
				.where(eq(charactersTable.userId, userId))
				.orderBy(asc(charactersTable.name));

			return rows.map(toCharacterSummary);
		},

		async transferCharactersToUser(fromUserId, toUserId) {
			const transferred = await getDb()
				.update(charactersTable)
				.set({ userId: toUserId, updatedAt: new Date() })
				.where(eq(charactersTable.userId, fromUserId))
				.returning({ id: charactersTable.id });

			return transferred.length;
		},

		async updateCharacterLevel(userId, characterId, level) {
			const [updated] = await getDb()
				.update(charactersTable)
				.set({ level, updatedAt: new Date() })
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.returning({ id: charactersTable.id });

			if (!updated) return null;
			return CharacterIdSchema.parse(updated.id);
		},

		async updateCharacterName(userId, characterId, name) {
			const [updated] = await getDb()
				.update(charactersTable)
				.set({ name, updatedAt: new Date() })
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.returning({ id: charactersTable.id });

			if (!updated) return null;
			return CharacterIdSchema.parse(updated.id);
		},

		async updateCharacterExperience(userId, characterId, experiencePoints) {
			const [updated] = await getDb()
				.update(charactersTable)
				.set({ experiencePoints, updatedAt: new Date() })
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.returning({ id: charactersTable.id });

			if (!updated) return null;
			return CharacterIdSchema.parse(updated.id);
		},
	};
}

export async function insertCharacterIdentity(
	userId: string,
	input: Omit<CharacterSummary, "id">,
	transaction: DatabaseTransaction,
) {
	const [created] = await transaction
		.insert(charactersTable)
		.values({ userId, ...input })
		.returning({ id: charactersTable.id });
	return CharacterIdSchema.parse(created?.id);
}
