import { getDb } from "@providers/database/index.js";
import { and, desc, eq } from "drizzle-orm";
import type {
	CharacterHealth,
	HealthChangeResponse,
	UpdateCharacterHealthResponse,
} from "../types/index.js";
import { CharacterHealthSchema } from "../types/index.js";
import { toCharacterHealth, toHealthChange } from "./character-mappers.js";
import {
	characterHealthEventsTable,
	characterHealthTable,
	charactersTable,
} from "./character-table.js";

export interface NewHealthChange {
	previous: CharacterHealth;
	next: CharacterHealth;
	currentHpDelta: number;
	maxHpDelta: number;
	temporaryHpDelta: number;
}

export interface CharacterHealthRepository {
	findCharacterHealth(userId: string, characterId: string): Promise<CharacterHealth | null>;
	saveCharacterHealth(
		userId: string,
		characterId: string,
		health: CharacterHealth,
		change: NewHealthChange | null,
	): Promise<UpdateCharacterHealthResponse | null>;
	listRecentHealthChanges(characterId: string): Promise<HealthChangeResponse[]>;
}

export function createCharacterHealthRepository(): CharacterHealthRepository {
	return {
		async findCharacterHealth(userId, characterId) {
			const [row] = await getDb()
				.select({
					currentHp: characterHealthTable.currentHp,
					maxHp: characterHealthTable.maxHp,
					temporaryHp: characterHealthTable.temporaryHp,
				})
				.from(charactersTable)
				.innerJoin(characterHealthTable, eq(characterHealthTable.characterId, charactersTable.id))
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.limit(1);

			return row ? toCharacterHealth(row) : null;
		},

		async saveCharacterHealth(userId, characterId, health, change) {
			return getDb().transaction(async (tx) => {
				const [owned] = await tx
					.select({ id: charactersTable.id })
					.from(charactersTable)
					.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
					.limit(1);

				if (!owned) return null;

				await tx
					.update(characterHealthTable)
					.set({
						currentHp: health.currentHp,
						maxHp: health.maxHp,
						temporaryHp: health.temporaryHp,
						updatedAt: new Date(),
					})
					.where(eq(characterHealthTable.characterId, characterId));

				if (change) {
					await tx.insert(characterHealthEventsTable).values({
						characterId,
						previousCurrentHp: change.previous.currentHp,
						nextCurrentHp: change.next.currentHp,
						previousMaxHp: change.previous.maxHp,
						nextMaxHp: change.next.maxHp,
						previousTemporaryHp: change.previous.temporaryHp,
						nextTemporaryHp: change.next.temporaryHp,
						currentHpDelta: change.currentHpDelta,
						maxHpDelta: change.maxHpDelta,
						temporaryHpDelta: change.temporaryHpDelta,
					});
				}

				const rows = await tx
					.select(healthChangeColumns())
					.from(characterHealthEventsTable)
					.where(eq(characterHealthEventsTable.characterId, characterId))
					.orderBy(desc(characterHealthEventsTable.createdAt))
					.limit(5);

				return {
					health: CharacterHealthSchema.parse(health),
					recentHealthChanges: rows.map(toHealthChange),
				};
			});
		},

		async listRecentHealthChanges(characterId) {
			const rows = await getDb()
				.select(healthChangeColumns())
				.from(characterHealthEventsTable)
				.where(eq(characterHealthEventsTable.characterId, characterId))
				.orderBy(desc(characterHealthEventsTable.createdAt))
				.limit(5);

			return rows.map(toHealthChange);
		},
	};
}

function healthChangeColumns() {
	return {
		id: characterHealthEventsTable.id,
		previousCurrentHp: characterHealthEventsTable.previousCurrentHp,
		nextCurrentHp: characterHealthEventsTable.nextCurrentHp,
		previousMaxHp: characterHealthEventsTable.previousMaxHp,
		nextMaxHp: characterHealthEventsTable.nextMaxHp,
		previousTemporaryHp: characterHealthEventsTable.previousTemporaryHp,
		nextTemporaryHp: characterHealthEventsTable.nextTemporaryHp,
		currentHpDelta: characterHealthEventsTable.currentHpDelta,
		maxHpDelta: characterHealthEventsTable.maxHpDelta,
		temporaryHpDelta: characterHealthEventsTable.temporaryHpDelta,
		createdAt: characterHealthEventsTable.createdAt,
	};
}
