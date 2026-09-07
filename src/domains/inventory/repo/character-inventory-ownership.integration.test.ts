import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDatabaseUrl, getDb } from "@providers/database/index.js";
import { eq, inArray, sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, afterEach, expect, it } from "vitest";
import { CharacterNotFoundError, requireOwnedCharacter } from "../../characters/service/index.js";
import { inventoryHistoryEntriesTable, inventoryScopesTable } from "../schema/index.js";
import { createCharacterHistoryService } from "../service/character-history-service.js";
import { createCharacterItemService } from "../service/character-item-service.js";
import { createCharacterTreasuryService } from "../service/character-treasury-service.js";
import { parseInventoryHistoryEntryInput } from "../types/index.js";
import {
	CharacterInventoryAccessError,
	createCharacterInventoryScopeRepository,
} from "./character-inventory-scope-repository.js";
import {
	createCharacterItemRepository,
	type InventoryItemHistoryWriter,
} from "./character-item-repository.js";
import {
	type CharacterTreasuryHistoryWriter,
	createCharacterTreasuryRepository,
} from "./character-treasury-repository.js";
import { toInventoryHistoryInsert } from "./inventory-history-mappers.js";

const userIds: string[] = [];
const itemInput = {
	name: "Rope",
	type: "misc" as const,
	category: "Gear",
	properties: {},
	quantity: 1,
};
const delta = { cp: 1, sp: 0, gp: 0, pp: 0 };
const zero = { cp: 0, sp: 0, gp: 0, pp: 0 };
afterEach(async () => {
	if (userIds.length) await getDb().delete(userTable).where(inArray(userTable.id, userIds));
	userIds.length = 0;
});
afterAll(closeDb);

it("denies every character inventory write before changing scope, state or history", async () => {
	const { owner, stranger } = await fixture();
	const items = createCharacterItemRepository();
	const treasury = createCharacterTreasuryRepository();
	await expect(items.createItemForCharacterWithHistory(stranger, itemInput)).rejects.toBeInstanceOf(
		CharacterInventoryAccessError,
	);
	await expect(treasury.mutateCharacterTreasury(stranger, () => delta)).rejects.toBeInstanceOf(
		CharacterInventoryAccessError,
	);
	const scopes = createCharacterInventoryScopeRepository();
	expect(await scopes.findCharacterScopeId(owner.characterId)).toBeNull();
	const item = await items.createItemForCharacterWithHistory(owner, itemInput);
	for (const write of [
		() => items.updateItemWithHistory(stranger, item.id, { quantity: 2 }),
		() => items.deleteItemWithHistory(stranger, item.id),
		() => items.setEquippedWithHistory(stranger, item.id, true),
		() => items.setEquippedWithHistory(stranger, item.id, false),
		() => treasury.mutateCharacterTreasury(stranger, () => delta),
	])
		await expect(write()).rejects.toBeInstanceOf(CharacterInventoryAccessError);
	expect(await items.findItem(item.inventoryScopeId, item.id)).toEqual(item);
	expect((await treasury.findCharacterTreasury(owner.characterId)).balances).toEqual(zero);
	expect(await history(owner.characterId)).toHaveLength(1);
});

it.each([
	"item",
	"treasury",
] as const)("rechecks %s ownership after the service precheck and preserves 404", async (kind) => {
	const { owner, stranger } = await fixture();
	const requireCharacter: typeof requireOwnedCharacter = async (userId, characterId) => {
		const identity = await requireOwnedCharacter(userId, characterId);
		await getDb().execute(
			sql`update characters set user_id = ${stranger.userId} where id = ${characterId}`,
		);
		return identity;
	};
	const write =
		kind === "item"
			? createCharacterItemService({ requireCharacter }).createCharacterItem(
					owner.userId,
					owner.characterId,
					itemInput,
				)
			: createCharacterTreasuryService({ requireCharacter }).addCharacterTreasury(
					owner.userId,
					owner.characterId,
					{ delta, expectedPrevious: zero },
				);
	await expect(write).rejects.toBeInstanceOf(CharacterNotFoundError);
	expect(
		await createCharacterInventoryScopeRepository().findCharacterScopeId(owner.characterId),
	).toBeNull();
	const items = createCharacterItemService();
	await expect(items.listCharacterItems(owner.userId, owner.characterId)).rejects.toBeInstanceOf(
		CharacterNotFoundError,
	);
	await expect(
		items.createCharacterItem(stranger.userId, stranger.characterId, itemInput),
	).resolves.toBeDefined();
	await expect(
		createCharacterTreasuryService().addCharacterTreasury(stranger.userId, stranger.characterId, {
			delta,
			expectedPrevious: zero,
		}),
	).resolves.toBeDefined();
	await expect(
		createCharacterHistoryService().listCharacterHistory(stranger.userId, stranger.characterId),
	).resolves.toMatchObject({ total: 2 });
});

it.each([
	"item",
	"treasury",
] as const)("holds ownership through the %s state and history commit", async (kind) => {
	const { owner, stranger } = await fixture();
	const second = postgres(getDatabaseUrl(), { max: 1, connection: { statement_timeout: 10_000 } });
	const locked = deferred<number>();
	const release = deferred<void>();
	const historyWriter: CharacterTreasuryHistoryWriter = async (tx, scopeId, input) => {
		await tx.insert(inventoryHistoryEntriesTable).values(toInventoryHistoryInsert(scopeId, input));
		const rows = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
		locked.resolve(rows[0].pid);
		await release.promise;
	};
	const itemHistoryWriter: InventoryItemHistoryWriter = (
		tx,
		scopeId,
		action,
		item,
		_before,
		actorUserId,
	) =>
		historyWriter(
			tx,
			scopeId,
			parseInventoryHistoryEntryInput({
				action,
				entityType: "item",
				entityId: item.id,
				entityName: item.name,
				actorUserId,
				details: { before: null, after: null, item },
			}),
		);
	let mutation: Promise<unknown> | undefined;
	let transfer: Promise<unknown> | undefined;
	try {
		const [{ pid: secondPid }] = await second<{ pid: number }[]>`select pg_backend_pid() as pid`;
		mutation =
			kind === "item"
				? createCharacterItemRepository({
						historyWriter: itemHistoryWriter,
					}).createItemForCharacterWithHistory(owner, itemInput)
				: createCharacterTreasuryRepository({ historyWriter }).mutateCharacterTreasury(
						owner,
						() => delta,
						{
							history: {
								operation: "add",
								requested: { delta },
								note: null,
								actorUserId: stranger.userId,
							},
						},
					);
		const firstPid = await Promise.race([
			locked.promise,
			mutation.then(() => {
				throw new Error("Mutation finished before the history barrier");
			}),
		]);
		expect(firstPid).not.toBe(secondPid);
		transfer =
			second`update characters set user_id = ${stranger.userId} where id = ${owner.characterId}`.execute();
		await expect
			.poll(
				async () => {
					const rows = await getDb().execute<{ blocked: boolean }>(
						sql`select ${firstPid} = any(pg_blocking_pids(${secondPid})) as blocked`,
					);
					return rows[0].blocked;
				},
				{ timeout: 5_000 },
			)
			.toBe(true);
		expect(await history(owner.characterId)).toHaveLength(0);
		release.resolve();
		await mutation;
		await transfer;
		const entries = await history(owner.characterId);
		expect(entries).toHaveLength(1);
		expect(entries[0].actorUserId).toBe(owner.userId);
		if (kind === "item") {
			const response = await createCharacterItemService().listCharacterItems(
				stranger.userId,
				owner.characterId,
			);
			expect(response.items).toHaveLength(1);
			expect(response.items[0]).toMatchObject(itemInput);
		} else {
			expect(
				(await createCharacterTreasuryRepository().findCharacterTreasury(owner.characterId))
					.balances,
			).toEqual(delta);
		}
		await expect(requireOwnedCharacter(owner.userId, owner.characterId)).rejects.toBeInstanceOf(
			CharacterNotFoundError,
		);
		await expect(requireOwnedCharacter(stranger.userId, owner.characterId)).resolves.toBeDefined();
	} finally {
		release.resolve();
		await Promise.allSettled([mutation, transfer]);
		await second.end();
	}
});

async function fixture() {
	const userId = crypto.randomUUID();
	const strangerId = crypto.randomUUID();
	const characterId = crypto.randomUUID();
	userIds.push(userId, strangerId);
	await getDb()
		.insert(userTable)
		.values([userId, strangerId].map((id) => ({ id, name: "Owner", email: `${id}@example.test` })));
	// Identity without health proves inventory does not depend on the detail projection.
	await getDb().execute(
		sql`insert into characters (id, user_id, name, class, level) values (${characterId}, ${userId}, 'Inventory owner', 'Fighter', 1)`,
	);
	return { owner: { userId, characterId }, stranger: { userId: strangerId, characterId } };
}

async function history(characterId: string) {
	return getDb()
		.select({ actorUserId: inventoryHistoryEntriesTable.actorUserId })
		.from(inventoryHistoryEntriesTable)
		.innerJoin(
			inventoryScopesTable,
			eq(inventoryHistoryEntriesTable.inventoryScopeId, inventoryScopesTable.id),
		)
		.where(eq(inventoryScopesTable.characterId, characterId));
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
