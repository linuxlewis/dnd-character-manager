import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDatabaseUrl, getDb } from "@providers/database/index.js";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, afterEach, expect, it } from "vitest";
import { createCharacter } from "../../../application/character-detail/workflows/create-character.js";
import * as schema from "../../../database/schema.js";
import { characterHealthTable } from "../../health/schema/index.js";
import { createCharacterSpellSlotRepository } from "../repo/character-spell-slot-repository.js";
import { CharacterNotFoundError, requireOwnedCharacter } from "../service/index.js";
import { findOwnedCharacter, lockOwnedCharacter } from "./index.js";

const userIds: string[] = [];
afterEach(async () => {
	if (userIds.length) await getDb().delete(userTable).where(inArray(userTable.id, userIds));
	userIds.length = 0;
});
afterAll(closeDb);

it("reads only parsed identity even when required health is absent", async () => {
	const { owner, stranger, character } = await fixture();
	await getDb()
		.delete(characterHealthTable)
		.where(eq(characterHealthTable.characterId, character.id));
	const client = postgres(getDatabaseUrl(), { max: 1 });
	const statements: string[] = [];
	const db = drizzle(client, { schema, logger: { logQuery: (query) => statements.push(query) } });
	try {
		const identity = { id: character.id, name: "Locked identity", className: "Wizard", level: 2 };
		await expect(findOwnedCharacter(owner, character.id, db)).resolves.toEqual(identity);
		expect(statements).toHaveLength(1);
		expect(statements[0]).not.toMatch(/health|events|spell|inventory/);
		await expect(findOwnedCharacter(stranger, character.id, db)).resolves.toBeNull();
		await expect(findOwnedCharacter(owner, crypto.randomUUID(), db)).resolves.toBeNull();
		await expect(requireOwnedCharacter(owner, character.id)).resolves.toEqual(identity);
		await expect(requireOwnedCharacter(stranger, character.id)).rejects.toBeInstanceOf(
			CharacterNotFoundError,
		);
		await expect(
			createCharacterSpellSlotRepository().findCharacterSpellSlotContext(owner, character.id),
		).resolves.toEqual({ className: identity.className, level: identity.level });
		await expect(
			createCharacterSpellSlotRepository().findCharacterSpellSlotContext(stranger, character.id),
		).resolves.toBeNull();
	} finally {
		await client.end();
	}
});

it("holds the identity lock on the caller transaction until transfer can commit", async () => {
	const { owner, stranger, character } = await fixture();
	const first = postgres(getDatabaseUrl(), { max: 1, connection: { statement_timeout: 10_000 } });
	const second = postgres(getDatabaseUrl(), { max: 1, connection: { statement_timeout: 10_000 } });
	const db = drizzle(first, { schema });
	const locked = deferred();
	const release = deferred();
	let mutation: Promise<unknown> | undefined;
	let transfer: Promise<unknown> | undefined;
	try {
		const [{ pid: firstPid }] = await first<{ pid: number }[]>`select pg_backend_pid() as pid`;
		const [{ pid: secondPid }] = await second<{ pid: number }[]>`select pg_backend_pid() as pid`;
		expect(firstPid).not.toBe(secondPid);
		mutation = db.transaction(async (tx) => {
			const identity = await lockOwnedCharacter(owner, character.id, tx);
			expect(identity?.id).toBe(character.id);
			locked.resolve();
			await release.promise;
		});
		await Promise.race([locked.promise, mutation]);
		transfer =
			second`update characters set user_id = ${stranger} where id = ${character.id} and user_id = ${owner}`.execute();
		await expect
			.poll(
				async () => {
					const rows = await getDb().execute<{ blocked: boolean }>(
						schemaSql`select ${firstPid} = any(pg_blocking_pids(${secondPid})) as blocked`,
					);
					return rows[0].blocked;
				},
				{ timeout: 5_000 },
			)
			.toBe(true);
		await expect(findOwnedCharacter(owner, character.id, getDb())).resolves.not.toBeNull();
		release.resolve();
		await mutation;
		await transfer;
		await expect(
			db.transaction((tx) => lockOwnedCharacter(owner, character.id, tx)),
		).resolves.toBeNull();
		await expect(
			db.transaction((tx) => lockOwnedCharacter(stranger, character.id, tx)),
		).resolves.toMatchObject({ id: character.id });
	} finally {
		release.resolve();
		await Promise.allSettled([mutation, transfer]);
		await first.end();
		await second.end();
	}
});

it("rechecks ownership after waiting for an in-flight transfer", async () => {
	const { owner, stranger, character } = await fixture();
	const first = postgres(getDatabaseUrl(), { max: 1, connection: { statement_timeout: 10_000 } });
	const second = postgres(getDatabaseUrl(), { max: 1, connection: { statement_timeout: 10_000 } });
	const db = drizzle(second, { schema });
	const transferred = deferred();
	const release = deferred();
	let transfer: Promise<unknown> | undefined;
	let access: Promise<unknown> | undefined;
	try {
		const [{ pid: firstPid }] = await first<{ pid: number }[]>`select pg_backend_pid() as pid`;
		const [{ pid: secondPid }] = await second<{ pid: number }[]>`select pg_backend_pid() as pid`;
		transfer = first.begin(async (tx) => {
			await tx`update characters set user_id = ${stranger} where id = ${character.id}`;
			transferred.resolve();
			await release.promise;
		});
		await Promise.race([transferred.promise, transfer]);
		access = db.transaction((tx) => lockOwnedCharacter(owner, character.id, tx));
		await expect
			.poll(
				async () => {
					const rows = await getDb().execute<{ blocked: boolean }>(
						schemaSql`select ${firstPid} = any(pg_blocking_pids(${secondPid})) as blocked`,
					);
					return rows[0].blocked;
				},
				{ timeout: 5_000 },
			)
			.toBe(true);
		release.resolve();
		await transfer;
		await expect(access).resolves.toBeNull();
		await expect(requireOwnedCharacter(stranger, character.id)).resolves.toMatchObject({
			id: character.id,
		});
	} finally {
		release.resolve();
		await Promise.allSettled([transfer, access]);
		await first.end();
		await second.end();
	}
});

async function fixture() {
	const owner = crypto.randomUUID();
	const stranger = crypto.randomUUID();
	userIds.push(owner, stranger);
	await getDb()
		.insert(userTable)
		.values(userIds.slice(-2).map((id) => ({ id, name: "Access", email: `${id}@example.test` })));
	const character = await createCharacter({
		userId: owner,
		name: "Locked identity",
		className: "Wizard",
		level: 2,
		maxHp: 18,
	});
	return { owner, stranger, character };
}

function deferred() {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

import { sql as schemaSql } from "drizzle-orm";
