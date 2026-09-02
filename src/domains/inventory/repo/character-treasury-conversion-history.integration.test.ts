import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { count, eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import type { CharacterTreasuryHistoryWriter } from "./character-treasury-repository.js";
import {
	CharacterTreasuryPreconditionError,
	createCharacterTreasuryRepository,
} from "./character-treasury-repository.js";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";

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

describe("character treasury conversion history persistence", () => {
	it("writes exact conversion history while preserving total value", async () => {
		const { characterId, userId: actorUserId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();
		const seeded = await repository.mutateCharacterTreasury(characterId, (current) => ({
			...current,
			pp: 1,
		}));

		const converted = await repository.mutateCharacterTreasury(
			characterId,
			(current) => ({ ...current, gp: 10, pp: 0 }),
			{
				expectedPrevious: seeded.balances,
				history: {
					operation: "convert",
					requested: { from: "pp", to: "gp", amount: 1 },
					note: "  Converted before the journey  ",
					actorUserId,
				},
			},
		);

		expect(converted.balances).toEqual({ cp: 0, sp: 0, gp: 10, pp: 0 });
		expect(converted.totalValue).toEqual({ copper: 1_000, gp: 10 });
		const [scope] = await getDb()
			.select({ id: inventoryScopesTable.id })
			.from(inventoryScopesTable)
			.where(eq(inventoryScopesTable.characterId, characterId));
		const [entry] = await getDb()
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

		expect(entry).toEqual({
			action: "currency_updated",
			entityType: "currency",
			entityId: null,
			entityName: null,
			actorUserId,
			details: {
				version: 1,
				operation: "convert",
				previous: { cp: 0, sp: 0, gp: 0, pp: 1 },
				next: { cp: 0, sp: 0, gp: 10, pp: 0 },
				delta: { cp: 0, sp: 0, gp: 10, pp: -1 },
				requested: { from: "pp", to: "gp", amount: 1 },
				note: "Converted before the journey",
			},
		});
	});

	it("rolls back a conversion when history insertion fails", async () => {
		const { characterId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();
		const seeded = await repository.mutateCharacterTreasury(characterId, (current) => ({
			...current,
			pp: 1,
		}));
		const historyWriter: CharacterTreasuryHistoryWriter = async () => {
			throw new Error("forced conversion history failure");
		};
		const failingRepository = createCharacterTreasuryRepository({ historyWriter });

		await expect(
			failingRepository.mutateCharacterTreasury(
				characterId,
				(current) => ({ ...current, gp: 10, pp: 0 }),
				{
					expectedPrevious: seeded.balances,
					history: {
						operation: "convert",
						requested: { from: "pp", to: "gp", amount: 1 },
						note: null,
						actorUserId: null,
					},
				},
			),
		).rejects.toThrow("forced conversion history failure");

		await expect(repository.findCharacterTreasury(characterId)).resolves.toMatchObject({
			balances: { cp: 0, sp: 0, gp: 0, pp: 1 },
		});
		const [scope] = await getDb()
			.select({ id: inventoryScopesTable.id })
			.from(inventoryScopesTable)
			.where(eq(inventoryScopesTable.characterId, characterId));
		expect(await historyCount(scope.id)).toBe(0);
	});

	it("does not append history for stale or no-op conversions", async () => {
		const { characterId, userId: actorUserId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();
		await repository.mutateCharacterTreasury(characterId, (current) => ({
			...current,
			pp: 1,
		}));
		const staleMutation = vi.fn((current) => ({ ...current, gp: 10, pp: 0 }));

		await expect(
			repository.mutateCharacterTreasury(characterId, staleMutation, {
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
				history: {
					operation: "convert",
					requested: { from: "pp", to: "gp", amount: 1 },
					note: null,
					actorUserId,
				},
			}),
		).rejects.toBeInstanceOf(CharacterTreasuryPreconditionError);
		expect(staleMutation).not.toHaveBeenCalled();

		await repository.mutateCharacterTreasury(characterId, (current) => current, {
			history: {
				operation: "convert",
				requested: { from: "pp", to: "gp", amount: 1 },
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

async function historyCount(scopeId: string) {
	const [row] = await getDb()
		.select({ count: count() })
		.from(inventoryHistoryEntriesTable)
		.where(eq(inventoryHistoryEntriesTable.inventoryScopeId, scopeId));
	return Number(row?.count ?? 0);
}
