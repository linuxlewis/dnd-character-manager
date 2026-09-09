import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { inventoryHistoryEntriesTable, inventoryScopesTable } from "../schema/index.js";
import type { InventoryItemHistoryWriter } from "./character-item-repository.js";
import { createCharacterItemRepository } from "./character-item-repository.js";
import { createInventoryItemRepository } from "./inventory-item-repository.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
});

afterAll(async () => closeDb());

describe("character item persistence", () => {
	it("rolls back character item mutations when history writing fails", async () => {
		const { characterId, scopeId, userId } = await createScope();
		const repository = createCharacterItemRepository();
		const existing = await createInventoryItemRepository().createItem(scopeId, {
			name: "Atomic Item",
			type: "equipment",
			category: "Equipment",
			properties: {},
		});
		const historyWriter: InventoryItemHistoryWriter = async () => {
			throw new Error("forced history failure");
		};
		const failingRepository = createCharacterItemRepository({ historyWriter });

		await expect(
			failingRepository.createItemForCharacterWithHistory(
				{ characterId, userId },
				{
					name: "Rolled Back Create",
					type: "misc",
					category: "Gear",
					properties: {},
				},
			),
		).rejects.toThrow("forced history failure");
		await expect(
			failingRepository.updateItemWithHistory({ characterId, userId }, existing.id, {
				quantity: 2,
			}),
		).rejects.toThrow("forced history failure");
		await expect(
			failingRepository.deleteItemWithHistory({ characterId, userId }, existing.id),
		).rejects.toThrow("forced history failure");
		await expect(
			failingRepository.setEquippedWithHistory({ characterId, userId }, existing.id, true),
		).rejects.toThrow("forced history failure");

		expect(await repository.findItem(scopeId, existing.id)).toMatchObject({
			id: existing.id,
			quantity: 1,
			isEquipped: false,
		});
		expect((await repository.listItems(scopeId)).total).toBe(1);
		expect(await historyCount(scopeId)).toBe(0);

		await repository.setEquippedWithHistory({ characterId, userId }, existing.id, true);
		await expect(
			failingRepository.setEquippedWithHistory({ characterId, userId }, existing.id, false),
		).rejects.toThrow("forced history failure");
		expect(await repository.findItem(scopeId, existing.id)).toMatchObject({ isEquipped: true });
		expect(await historyCount(scopeId)).toBe(1);
	});

	it("writes exactly one deterministic history entry per successful character mutation", async () => {
		const { characterId, scopeId, userId } = await createScope();
		const repository = createCharacterItemRepository();
		const created = await repository.createItemForCharacterWithHistory(
			{ characterId, userId },
			{
				name: "History Item",
				type: "misc",
				category: "Gear",
				properties: { source: "test" },
			},
		);
		const updated = await repository.updateItemWithHistory({ characterId, userId }, created.id, {
			quantity: 2,
		});
		const equipped = await repository.setEquippedWithHistory(
			{ characterId, userId },
			created.id,
			true,
		);
		const unequipped = await repository.setEquippedWithHistory(
			{ characterId, userId },
			created.id,
			false,
		);
		const deleted = await repository.deleteItemWithHistory({ characterId, userId }, created.id);

		expect(updated).toMatchObject({ id: created.id, quantity: 2 });
		expect(equipped).toMatchObject({ id: created.id, isEquipped: true });
		expect(unequipped).toMatchObject({ id: created.id, isEquipped: false });
		expect(deleted).toMatchObject({ id: created.id });

		const entries = await getDb()
			.select({
				inventoryScopeId: inventoryHistoryEntriesTable.inventoryScopeId,
				action: inventoryHistoryEntriesTable.action,
				entityId: inventoryHistoryEntriesTable.entityId,
				entityName: inventoryHistoryEntriesTable.entityName,
				actorUserId: inventoryHistoryEntriesTable.actorUserId,
				details: inventoryHistoryEntriesTable.details,
			})
			.from(inventoryHistoryEntriesTable)
			.where(eq(inventoryHistoryEntriesTable.inventoryScopeId, scopeId))
			.orderBy(desc(inventoryHistoryEntriesTable.createdAt), desc(inventoryHistoryEntriesTable.id));

		expect(entries).toHaveLength(5);
		expect(entries.every((entry) => entry.actorUserId === userId)).toBe(true);
		expect(entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					inventoryScopeId: scopeId,
					action: "item_added",
					entityId: created.id,
					entityName: "History Item",
				}),
				expect.objectContaining({
					action: "item_updated",
					entityId: created.id,
					details: expect.objectContaining({
						before: expect.objectContaining({ quantity: 1 }),
						after: expect.objectContaining({ quantity: 2 }),
					}),
				}),
			]),
		);
		expect(entries.filter((entry) => entry.action === "item_updated")).toHaveLength(3);
		expect(entries.filter((entry) => entry.action === "item_added")).toHaveLength(1);
		expect(entries.filter((entry) => entry.action === "item_removed")).toHaveLength(1);
	});

	it("does not update or write history when submitted fields have not changed", async () => {
		const { characterId, scopeId, userId } = await createScope();
		const repository = createCharacterItemRepository();
		const created = await repository.createItemForCharacterWithHistory(
			{ characterId, userId },
			{
				name: "Unchanged Item",
				type: "misc",
				category: "Gear",
				properties: { nested: { source: "test" } },
			},
		);

		const unchanged = await repository.updateItemWithHistory({ characterId, userId }, created.id, {
			name: created.name,
			properties: { nested: { source: "test" } },
		});

		expect(unchanged).toEqual(created);
		expect(await historyCount(scopeId)).toBe(1);
	});
});

async function createScope() {
	const userId = crypto.randomUUID();
	const characterId = crypto.randomUUID();
	const scopeId = crypto.randomUUID();
	createdUserIds.push(userId);
	await getDb()
		.insert(userTable)
		.values({
			id: userId,
			name: "Character Item Test User",
			email: `${userId}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	await getDb().execute(sql`
		INSERT INTO characters (id, user_id, name, class, level)
		VALUES (${characterId}, ${userId}, 'Character Item Test Character', 'Fighter', 1)
	`);
	await getDb().insert(inventoryScopesTable).values({ id: scopeId, characterId });
	return { characterId, scopeId, userId };
}

async function historyCount(scopeId: string) {
	const [row] = await getDb()
		.select({ count: count() })
		.from(inventoryHistoryEntriesTable)
		.where(eq(inventoryHistoryEntriesTable.inventoryScopeId, scopeId));
	return Number(row?.count ?? 0);
}
