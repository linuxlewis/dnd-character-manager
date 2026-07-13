import { getDb } from "@providers/database/index.js";
import { and, asc, eq } from "drizzle-orm";
import type { CharacterDetail, CharacterSummary, CreateCharacterRequest } from "../types/index.js";
import type { CharacterHealthRepository } from "./character-health-repository.js";
import { createCharacterHealthRepository } from "./character-health-repository.js";
import { toCharacterDetail, toCharacterSummary } from "./character-mappers.js";
import { characterHealthTable, charactersTable } from "./character-table.js";

export interface CreateCharacterRecord extends CreateCharacterRequest {
	userId: string;
}

export interface CharacterRepository {
	createCharacter(input: CreateCharacterRecord): Promise<CharacterDetail>;
	listCharacters(userId: string): Promise<CharacterSummary[]>;
	findCharacterDetail(userId: string, characterId: string): Promise<CharacterDetail | null>;
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
}

export function createCharacterRepository(
	healthRepository: Pick<
		CharacterHealthRepository,
		"listRecentHealthChanges"
	> = createCharacterHealthRepository(),
): CharacterRepository {
	return {
		async createCharacter(input) {
			const db = getDb();
			const normalized = {
				userId: input.userId,
				name: input.name,
				className: input.className,
				level: input.level,
				maxHp: input.maxHp,
			};

			const characterId = await db.transaction(async (tx) => {
				const [created] = await tx
					.insert(charactersTable)
					.values(normalized)
					.returning({ id: charactersTable.id });

				await tx.insert(characterHealthTable).values({
					characterId: created.id,
					currentHp: normalized.maxHp,
					maxHp: normalized.maxHp,
					temporaryHp: 0,
				});

				return created.id;
			});

			const character = await this.findCharacterDetail(input.userId, characterId);
			if (!character) throw new Error("Created character could not be loaded.");
			return character;
		},

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
	};
}
