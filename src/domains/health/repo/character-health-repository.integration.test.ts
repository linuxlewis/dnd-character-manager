import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDatabaseUrl, getDb } from "@providers/database/index.js";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, afterEach, expect, it } from "vitest";
import { createCharacter } from "../../../application/character-detail/workflows/create-character.js";
import * as schema from "../../../database/schema.js";
import { characterHealthEventsTable, characterHealthTable } from "../schema/index.js";
import type { UpdateCharacterHealthResponse } from "../types/index.js";
import {
	createCharacterHealthRepository,
	insertHealthChange,
} from "./character-health-repository.js";

const users: string[] = [];
afterEach(async () => {
	if (users.length) await getDb().delete(userTable).where(inArray(userTable.id, users));
	users.length = 0;
});
afterAll(closeDb);

it("normalizes current state, skips no-op events, and denies missing/foreign health", async () => {
	const { owner, other, id } = await fixture();
	const repo = createCharacterHealthRepository();
	const input = { currentHp: 10, maxHp: 20, temporaryHp: 0 };
	const before = await repo.updateCharacterHealth(owner, id, input);
	expect(before?.recentHealthChanges).toEqual([]);
	expect(await repo.updateCharacterHealth(other, id, { ...input, currentHp: 1 })).toBeNull();
	expect(
		await getDb()
			.select()
			.from(characterHealthEventsTable)
			.where(eq(characterHealthEventsTable.characterId, id)),
	).toEqual([]);
	await getDb().delete(characterHealthTable).where(eq(characterHealthTable.characterId, id));
	expect(await repo.updateCharacterHealth(owner, id, input)).toBeNull();
	expect(
		await getDb()
			.select()
			.from(characterHealthTable)
			.where(eq(characterHealthTable.characterId, id)),
	).toEqual([]);
});

it("rolls back real state and event insertion when the event writer fails", async () => {
	const { owner, id } = await fixture();
	const repo = createCharacterHealthRepository(getDb, async (...args) => {
		await insertHealthChange(...args);
		throw new Error("injected history failure");
	});
	await expect(
		repo.updateCharacterHealth(owner, id, { currentHp: 10, maxHp: 25, temporaryHp: 0 }),
	).rejects.toThrow("injected history failure");
	const [health] = await getDb()
		.select()
		.from(characterHealthTable)
		.where(eq(characterHealthTable.characterId, id));
	expect(health).toMatchObject({ currentHp: 10, maxHp: 20, temporaryHp: 0 });
	expect(
		await getDb()
			.select()
			.from(characterHealthEventsTable)
			.where(eq(characterHealthEventsTable.characterId, id)),
	).toEqual([]);
});

it("serializes absolute health normalization after the identity lock", async () => {
	const { owner, id } = await fixture();
	const clients = await connections();
	const locked = deferred();
	const release = deferred();
	let a: Promise<UpdateCharacterHealthResponse | null> | undefined;
	let b: Promise<UpdateCharacterHealthResponse | null> | undefined;
	try {
		const first = createCharacterHealthRepository(
			() => clients.firstDb,
			async (...args) => {
				await insertHealthChange(...args);
				locked.resolve();
				await release.promise;
			},
		);
		const second = createCharacterHealthRepository(() => clients.secondDb);
		a = first.updateCharacterHealth(owner, id, { currentHp: 10, maxHp: 25, temporaryHp: 0 });
		await Promise.race([locked.promise, a]);
		b = second.updateCharacterHealth(owner, id, { currentHp: 10, maxHp: 30, temporaryHp: 0 });
		await blocked(clients.firstPid, clients.secondPid);
		release.resolve();
		const firstResult = await a;
		const secondResult = await b;
		expect(
			secondResult?.recentHealthChanges.find((change) => change.next.maxHp === 30)?.previous,
		).toEqual(firstResult?.health);
		await expect(b).resolves.toMatchObject({ health: { currentHp: 15, maxHp: 30 } });
		const events = await getDb()
			.select()
			.from(characterHealthEventsTable)
			.where(eq(characterHealthEventsTable.characterId, id));
		expect(events).toHaveLength(2);
		expect(events.find((e) => e.nextMaxHp === 30)).toMatchObject({
			previousCurrentHp: 15,
			nextCurrentHp: 15,
			previousMaxHp: 25,
			maxHpDelta: 5,
			currentHpDelta: 0,
		});
	} finally {
		release.resolve();
		await Promise.allSettled([a, b]);
		await clients.close();
	}
});

it("holds ownership through health commit, then denies the former owner", async () => {
	const { owner, other, id } = await fixture();
	const clients = await connections();
	const locked = deferred();
	const release = deferred();
	let mutation: Promise<unknown> | undefined;
	let transfer: Promise<unknown> | undefined;
	try {
		const repo = createCharacterHealthRepository(
			() => clients.firstDb,
			async (...args) => {
				await insertHealthChange(...args);
				locked.resolve();
				await release.promise;
			},
		);
		mutation = repo.updateCharacterHealth(owner, id, { currentHp: 10, maxHp: 25, temporaryHp: 0 });
		await Promise.race([locked.promise, mutation]);
		transfer = clients.second`update characters set user_id = ${other} where id = ${id}`.execute();
		await blocked(clients.firstPid, clients.secondPid);
		release.resolve();
		await mutation;
		await transfer;
		const plain = createCharacterHealthRepository(() => clients.firstDb);
		expect(
			await plain.updateCharacterHealth(owner, id, { currentHp: 1, maxHp: 20, temporaryHp: 0 }),
		).toBeNull();
		expect(
			await plain.updateCharacterHealth(other, id, { currentHp: 15, maxHp: 25, temporaryHp: 0 }),
		).toMatchObject({
			health: { currentHp: 15, maxHp: 25 },
			recentHealthChanges: [expect.objectContaining({ maxHpDelta: 5 })],
		});
	} finally {
		release.resolve();
		await Promise.allSettled([mutation, transfer]);
		await clients.close();
	}
});

it("rechecks health mutation ownership after waiting for an in-flight transfer", async () => {
	const { owner, other, id } = await fixture();
	const clients = await connections();
	const locked = deferred();
	const release = deferred();
	let transfer: Promise<unknown> | undefined;
	let mutation: Promise<unknown> | undefined;
	try {
		transfer = clients.first.begin(async (tx) => {
			await tx`update characters set user_id = ${other} where id = ${id}`;
			locked.resolve();
			await release.promise;
		});
		await Promise.race([locked.promise, transfer]);
		mutation = createCharacterHealthRepository(() => clients.secondDb).updateCharacterHealth(
			owner,
			id,
			{ currentHp: 1, maxHp: 25, temporaryHp: 0 },
		);
		await blocked(clients.firstPid, clients.secondPid);
		release.resolve();
		await transfer;
		await expect(mutation).resolves.toBeNull();
		const [health] = await getDb()
			.select()
			.from(characterHealthTable)
			.where(eq(characterHealthTable.characterId, id));
		expect(health).toMatchObject({ currentHp: 10, maxHp: 20 });
		expect(
			await getDb()
				.select()
				.from(characterHealthEventsTable)
				.where(eq(characterHealthEventsTable.characterId, id)),
		).toEqual([]);
	} finally {
		release.resolve();
		await Promise.allSettled([mutation, transfer]);
		await clients.close();
	}
});

async function fixture() {
	const owner = crypto.randomUUID(),
		other = crypto.randomUUID();
	users.push(owner, other);
	await getDb()
		.insert(userTable)
		.values([owner, other].map((id) => ({ id, name: "Health", email: `${id}@example.test` })));
	const character = await createCharacter({
		userId: owner,
		name: "Health",
		className: "Cleric",
		level: 2,
		maxHp: 20,
	});
	await getDb()
		.update(characterHealthTable)
		.set({ currentHp: 10 })
		.where(eq(characterHealthTable.characterId, character.id));
	return { owner, other, id: character.id };
}
async function connections() {
	const first = postgres(getDatabaseUrl(), { max: 1, connection: { statement_timeout: 10000 } });
	const second = postgres(getDatabaseUrl(), { max: 1, connection: { statement_timeout: 10000 } });
	try {
		const [{ pid: firstPid }] = await first<{ pid: number }[]>`select pg_backend_pid() as pid`;
		const [{ pid: secondPid }] = await second<{ pid: number }[]>`select pg_backend_pid() as pid`;
		expect(firstPid).not.toBe(secondPid);
		return {
			first,
			second,
			firstPid,
			secondPid,
			firstDb: drizzle(first, { schema }),
			secondDb: drizzle(second, { schema }),
			close: async () => {
				await first.end();
				await second.end();
			},
		};
	} catch (error) {
		await Promise.allSettled([first.end(), second.end()]);
		throw error;
	}
}
async function blocked(blocker: number, waiter: number) {
	await expect
		.poll(
			async () =>
				(
					await getDb().execute<{ blocked: boolean }>(
						sql`select ${blocker} = any(pg_blocking_pids(${waiter})) as blocked`,
					)
				)[0].blocked,
			{ timeout: 5000 },
		)
		.toBe(true);
}
function deferred() {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
