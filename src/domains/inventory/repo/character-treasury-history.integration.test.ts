import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { count, eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import type { CharacterTreasuryHistoryWriter } from "./character-treasury-repository.js";
import { createCharacterTreasuryRepository } from "./character-treasury-repository.js";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";
import { inventoryTreasuriesTable } from "./inventory-treasury-table.js";

const createdUserIds: string[] = [];

afterEach(async () => {
	if (createdUserIds.length === 0) return;
	await getDb()
		.delete(userTable)
		.where(inArray(userTable.id, [...createdUserIds]));
	createdUserIds.length = 0;
});

afterAll(async () => {
	await closeDb();
});

describe("character treasury history persistence", () => {
	it("writes exact add and making-change spend history with the authenticated actor", async () => {
		const { characterId, userId: actorUserId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();
		const zero = { cp: 0, sp: 0, gp: 0, pp: 0 };

		const added = await repository.mutateCharacterTreasury(
			characterId,
			() => ({ cp: 0, sp: 0, gp: 0, pp: 2 }),
			{
				expectedPrevious: zero,
				history: {
					operation: "add",
					requested: { delta: { cp: 0, sp: 0, gp: 0, pp: 2 } },
					note: "  Reward from the guild  ",
					actorUserId,
				},
			},
		);
		await repository.mutateCharacterTreasury(characterId, () => ({ cp: 0, sp: 0, gp: 5, pp: 0 }), {
			expectedPrevious: added.balances,
			history: {
				operation: "spend",
				requested: { amount: { denomination: "gp", amount: 15 } },
				note: "  Bought climbing gear  ",
				actorUserId,
			},
		});

		const [scope] = await getDb()
			.select({ id: inventoryScopesTable.id })
			.from(inventoryScopesTable)
			.where(eq(inventoryScopesTable.characterId, characterId));
		const entries = await getDb()
			.select({
				action: inventoryHistoryEntriesTable.action,
				entityType: inventoryHistoryEntriesTable.entityType,
				entityId: inventoryHistoryEntriesTable.entityId,
				entityName: inventoryHistoryEntriesTable.entityName,
				actorUserId: inventoryHistoryEntriesTable.actorUserId,
				details: inventoryHistoryEntriesTable.details,
			})
			.from(inventoryHistoryEntriesTable)
			.where(eq(inventoryHistoryEntriesTable.inventoryScopeId, scope.id));

		expect(entries).toHaveLength(2);
		expect(entries.every((entry) => entry.actorUserId === actorUserId)).toBe(true);
		expect(entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					action: "currency_updated",
					entityType: "currency",
					entityId: null,
					entityName: null,
					details: {
						version: 1,
						operation: "add",
						previous: zero,
						next: { cp: 0, sp: 0, gp: 0, pp: 2 },
						delta: { cp: 0, sp: 0, gp: 0, pp: 2 },
						requested: { delta: { cp: 0, sp: 0, gp: 0, pp: 2 } },
						note: "Reward from the guild",
					},
				}),
				expect.objectContaining({
					action: "currency_updated",
					details: {
						version: 1,
						operation: "spend",
						previous: { cp: 0, sp: 0, gp: 0, pp: 2 },
						next: { cp: 0, sp: 0, gp: 5, pp: 0 },
						delta: { cp: 0, sp: 0, gp: 5, pp: -2 },
						requested: { amount: { denomination: "gp", amount: 15 } },
						note: "Bought climbing gear",
					},
				}),
			]),
		);
	});

	it("rolls back the treasury mutation when history insertion fails", async () => {
		const { characterId } = await createCharacter();
		const historyWriter: CharacterTreasuryHistoryWriter = async () => {
			throw new Error("forced treasury history failure");
		};
		const repository = createCharacterTreasuryRepository({ historyWriter });

		await expect(
			repository.mutateCharacterTreasury(characterId, () => ({ cp: 0, sp: 0, gp: 1, pp: 0 }), {
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
				history: {
					operation: "add",
					requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
					note: null,
					actorUserId: null,
				},
			}),
		).rejects.toThrow("forced treasury history failure");

		await expect(repository.findCharacterTreasury(characterId)).resolves.toEqual(
			zeroTreasury(characterId),
		);
		expect(
			await countRows(inventoryScopesTable, characterId, inventoryScopesTable.characterId),
		).toBe(0);
		expect(
			await countRows(
				inventoryTreasuriesTable,
				characterId,
				inventoryTreasuriesTable.inventoryScopeId,
			),
		).toBe(0);
	});

	it("does not append history for a no-op treasury mutation", async () => {
		const { characterId, userId: actorUserId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();
		await repository.mutateCharacterTreasury(characterId, (current) => current, {
			history: {
				operation: "add",
				requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
				note: null,
				actorUserId,
			},
		});

		const [scope] = await getDb()
			.select({ id: inventoryScopesTable.id })
			.from(inventoryScopesTable)
			.where(eq(inventoryScopesTable.characterId, characterId));
		expect(await historyCount(scope.id)).toBe(0);
	});
});

async function createCharacter() {
	const userId = crypto.randomUUID();
	const characterId = crypto.randomUUID();
	createdUserIds.push(userId);
	await getDb()
		.insert(userTable)
		.values({
			id: userId,
			name: "Inventory Test User",
			email: `${userId}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	await getDb().execute(sql`
		INSERT INTO characters (id, user_id, name, class, level)
		VALUES (${characterId}, ${userId}, 'Inventory Test Character', 'Fighter', 1)
	`);
	return { characterId, userId };
}

async function countRows(
	table: typeof inventoryScopesTable | typeof inventoryTreasuriesTable,
	id: string,
	column:
		| typeof inventoryScopesTable.characterId
		| typeof inventoryTreasuriesTable.inventoryScopeId,
) {
	const [row] = await getDb().select({ count: count() }).from(table).where(eq(column, id));
	return Number(row?.count ?? 0);
}

async function historyCount(scopeId: string) {
	const [row] = await getDb()
		.select({ count: count() })
		.from(inventoryHistoryEntriesTable)
		.where(eq(inventoryHistoryEntriesTable.inventoryScopeId, scopeId));
	return Number(row?.count ?? 0);
}

function zeroTreasury(characterId: string) {
	return {
		characterId,
		balances: { cp: 0, sp: 0, gp: 0, pp: 0 },
		totalValue: { copper: 0, gp: 0 },
	};
}
