import type { DatabaseTransaction } from "@providers/database/index.js";
import { getDb } from "@providers/database/index.js";
import { and, asc, eq } from "drizzle-orm";
import { characterHealthTable, charactersTable } from "../schema/index.js";
import type { CharacterDetail, CharacterSummary } from "../types/index.js";
import { CharacterIdSchema } from "../types/index.js";
import type { CharacterHealthRepository } from "./character-health-repository.js";
import { createCharacterHealthRepository } from "./character-health-repository.js";
import { toCharacterDetail, toCharacterSummary } from "./character-mappers.js";

export interface CharacterRepository {
	listCharacters(userId: string): Promise<CharacterSummary[]>;
	findCharacterDetail(userId: string, characterId: string): Promise<CharacterDetail | null>;
	transferCharactersToUser(fromUserId: string, toUserId: string): Promise<number>;
	updateCharacterLevel(
		userId: string,
		characterId: string,
		level: number,
	): Promise<CharacterDetail | null>;
	updateCharacterName(
		userId: string,
		characterId: string,
		name: string,
	): Promise<CharacterDetail | null>;
	updateCharacterExperience(
		userId: string,
		characterId: string,
		experiencePoints: number,
	): Promise<CharacterDetail | null>;
}

export function createCharacterRepository(
	healthRepository: Pick<
		CharacterHealthRepository,
		"listRecentHealthChanges"
	> = createCharacterHealthRepository(),
): CharacterRepository {
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

		async findCharacterDetail(userId, characterId) {
			const [row] = await getDb()
				.select({
					id: charactersTable.id,
					name: charactersTable.name,
					className: charactersTable.className,
					level: charactersTable.level,
					experiencePoints: charactersTable.experiencePoints,
					currentHp: characterHealthTable.currentHp,
					maxHp: characterHealthTable.maxHp,
					temporaryHp: characterHealthTable.temporaryHp,
				})
				.from(charactersTable)
				.innerJoin(characterHealthTable, eq(characterHealthTable.characterId, charactersTable.id))
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.limit(1);

			if (!row) return null;

			return toCharacterDetail(row, await healthRepository.listRecentHealthChanges(characterId));
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
			return this.findCharacterDetail(userId, characterId);
		},

		async updateCharacterName(userId, characterId, name) {
			const [updated] = await getDb()
				.update(charactersTable)
				.set({ name, updatedAt: new Date() })
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.returning({ id: charactersTable.id });

			if (!updated) return null;
			return this.findCharacterDetail(userId, characterId);
		},

		async updateCharacterExperience(userId, characterId, experiencePoints) {
			const [updated] = await getDb()
				.update(charactersTable)
				.set({ experiencePoints, updatedAt: new Date() })
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.returning({ id: charactersTable.id });

			if (!updated) return null;
			return this.findCharacterDetail(userId, characterId);
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
