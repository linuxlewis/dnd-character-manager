import type { Database, DatabaseTransaction } from "@providers/database/index.js";
import { getDb } from "@providers/database/index.js";
import { desc, eq } from "drizzle-orm";
import { lockOwnedCharacter } from "../../characters/access/index.js";
import {
	normalizeHealthUpdate,
	toCharacterHealth,
	toHealthChange,
	toHealthChangeResponse,
} from "../config/index.js";
import { characterHealthEventsTable, characterHealthTable } from "../schema/index.js";
import {
	type NewHealthChange,
	type UpdateCharacterHealthRequest,
	type UpdateCharacterHealthResponse,
	UpdateCharacterHealthResponseSchema,
} from "../types/index.js";

export interface CharacterHealthRepository {
	updateCharacterHealth(
		userId: string,
		characterId: string,
		input: UpdateCharacterHealthRequest,
	): Promise<UpdateCharacterHealthResponse | null>;
}

export function createCharacterHealthRepository(
	database: () => Database = getDb,
	writeChange = insertHealthChange,
): CharacterHealthRepository {
	return {
		async updateCharacterHealth(userId, characterId, input) {
			return database().transaction(async (tx) => {
				if (!(await lockOwnedCharacter(userId, characterId, tx))) return null;
				const [row] = await tx
					.select()
					.from(characterHealthTable)
					.where(eq(characterHealthTable.characterId, characterId));
				if (!row) return null;
				const previous = toCharacterHealth(row);
				const health = normalizeHealthUpdate(previous, input);
				const change = toHealthChange(previous, health);
				await tx
					.update(characterHealthTable)
					.set({
						currentHp: health.currentHp,
						maxHp: health.maxHp,
						temporaryHp: health.temporaryHp,
						updatedAt: new Date(),
					})
					.where(eq(characterHealthTable.characterId, characterId));
				if (change) await writeChange(tx, characterId, change);
				const rows = await tx
					.select()
					.from(characterHealthEventsTable)
					.where(eq(characterHealthEventsTable.characterId, characterId))
					.orderBy(desc(characterHealthEventsTable.createdAt))
					.limit(5);
				return UpdateCharacterHealthResponseSchema.parse({
					health,
					recentHealthChanges: rows.map(toHealthChangeResponse),
				});
			});
		},
	};
}

export async function insertHealthChange(
	tx: DatabaseTransaction,
	characterId: string,
	change: NewHealthChange,
) {
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

export async function insertInitialCharacterHealth(
	characterId: string,
	maxHp: number,
	transaction: DatabaseTransaction,
) {
	await transaction
		.insert(characterHealthTable)
		.values({ characterId, currentHp: maxHp, maxHp, temporaryHp: 0 });
}
