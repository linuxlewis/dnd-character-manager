import { getDb } from "@providers/database/index.js";
import { and, eq, sql } from "drizzle-orm";
import { expect, it } from "vitest";
import {
	holdCommit,
	spellcastingConnection,
	spellcastingFixture,
} from "../../../../tests/support/spellcasting-database.js";
import { characterSpellSlotEventsTable, characterSpellSlotsTable } from "../schema/index.js";
import { SpellSlotUnavailableError } from "../types/index.js";
import {
	createCharacterSpellSlotRepository,
	insertSpellSlotChanges,
} from "./character-spell-slot-repository.js";

const fixture = spellcastingFixture();
it.each([1, 2])("serializes concurrent consumption with %i available slots", async (total) => {
	const { owner, characterId } = await fixture();
	const first = spellcastingConnection(),
		second = spellcastingConnection();
	const gate = holdCommit(first.db);
	const pending: Promise<unknown>[] = [];
	try {
		const a = createCharacterSpellSlotRepository(() => first.db),
			b = createCharacterSpellSlotRepository(() => second.db);
		await a.mutateCharacterSpellSlots(owner, characterId, {
			action: "configured",
			input: { slots: [{ level: 1, total }] },
		});
		const [{ pid: firstPid }] = await first.client<
			{ pid: number }[]
		>`select pg_backend_pid() as pid`;
		const [{ pid: secondPid }] = await second.client<
			{ pid: number }[]
		>`select pg_backend_pid() as pid`;
		const use = createCharacterSpellSlotRepository(() => gate.db).mutateCharacterSpellSlots(
			owner,
			characterId,
			{ action: "used", input: { level: 1 } },
		);
		pending.push(use);
		await Promise.race([gate.entered.promise, use]);
		const otherUse = b.mutateCharacterSpellSlots(owner, characterId, {
			action: "used",
			input: { level: 1 },
		});
		pending.push(otherUse);
		const settled = Promise.allSettled(pending);
		await expect
			.poll(
				async () => {
					const rows = await getDb().execute<{ blocked: boolean }>(
						sql`select ${firstPid} = any(pg_blocking_pids(${secondPid})) as blocked`,
					);
					return rows[0].blocked;
				},
				{ timeout: 3000 },
			)
			.toBe(true);
		gate.release.resolve();
		const results = await settled;

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(total);
		for (const result of results)
			if (result.status === "rejected")
				expect(result.reason).toBeInstanceOf(SpellSlotUnavailableError);
		expect((await a.findCharacterSpellSlots(owner, characterId))?.[0]).toMatchObject({
			used: total,
			remaining: 0,
		});
		const events = await getDb()
			.select()
			.from(characterSpellSlotEventsTable)
			.where(
				and(
					eq(characterSpellSlotEventsTable.characterId, characterId),
					eq(characterSpellSlotEventsTable.action, "used"),
				),
			);
		expect(events.map((event) => [event.previousUsedSlots, event.nextUsedSlots]).sort()).toEqual(
			total === 2
				? [
						[0, 1],
						[1, 2],
					]
				: [[0, 1]],
		);
		const restores = await Promise.allSettled(
			Array.from({ length: total + 1 }, (_, index) =>
				(index % 2 ? a : b).mutateCharacterSpellSlots(owner, characterId, {
					action: "restored",
					input: { level: 1 },
				}),
			),
		);
		expect(restores.filter((result) => result.status === "fulfilled")).toHaveLength(total);
		expect((await a.findCharacterSpellSlots(owner, characterId))?.[0].used).toBe(0);
	} finally {
		gate.release.resolve();
		await Promise.allSettled(pending);
		await first.client.end();
		await second.client.end();
	}
});
it("rolls back actual slot and event writes together and emits no event for no-op configuration", async () => {
	const { owner, characterId } = await fixture();
	const repo = createCharacterSpellSlotRepository();
	const mutation = { action: "configured" as const, input: { slots: [{ level: 1, total: 2 }] } };
	await repo.mutateCharacterSpellSlots(owner, characterId, mutation);
	const before = await getDb()
		.select()
		.from(characterSpellSlotsTable)
		.where(eq(characterSpellSlotsTable.characterId, characterId));
	const history = await getDb()
		.select()
		.from(characterSpellSlotEventsTable)
		.where(eq(characterSpellSlotEventsTable.characterId, characterId));
	await repo.mutateCharacterSpellSlots(owner, characterId, mutation);
	expect(await repo.listRecentSpellSlotChanges(characterId)).toHaveLength(1);
	const failing = createCharacterSpellSlotRepository(getDb, async (tx, id, changes) => {
		await insertSpellSlotChanges(tx, id, changes);
		throw new Error("event failure");
	});
	await expect(
		failing.mutateCharacterSpellSlots(owner, characterId, { action: "used", input: { level: 1 } }),
	).rejects.toThrow("event failure");
	expect((await repo.findCharacterSpellSlots(owner, characterId))?.[0]).toMatchObject({
		used: 0,
		total: 2,
	});
	expect(
		await getDb()
			.select()
			.from(characterSpellSlotEventsTable)
			.where(eq(characterSpellSlotEventsTable.characterId, characterId)),
	).toEqual(history);
	expect(before).toHaveLength(9);
});

it("configuration reads committed usage after waiting for its identity lock", async () => {
	const { owner, characterId } = await fixture();
	const first = spellcastingConnection(),
		second = spellcastingConnection(),
		gate = holdCommit(first.db);
	const repo = createCharacterSpellSlotRepository();
	const pending: Promise<unknown>[] = [];
	try {
		await repo.mutateCharacterSpellSlots(owner, characterId, {
			action: "configured",
			input: { slots: [{ level: 1, total: 2 }] },
		});
		const [{ pid: firstPid }] = await first.client<
			{ pid: number }[]
		>`select pg_backend_pid() as pid`;
		const [{ pid: secondPid }] = await second.client<
			{ pid: number }[]
		>`select pg_backend_pid() as pid`;
		const use = createCharacterSpellSlotRepository(() => gate.db).mutateCharacterSpellSlots(
			owner,
			characterId,
			{ action: "used", input: { level: 1 } },
		);
		pending.push(use);
		await Promise.race([gate.entered.promise, use]);
		const configure = createCharacterSpellSlotRepository(() => second.db).mutateCharacterSpellSlots(
			owner,
			characterId,
			{ action: "configured", input: { slots: [{ level: 1, total: 0 }] } },
		);
		pending.push(configure);
		const settled = Promise.allSettled(pending);
		await expect
			.poll(
				async () => {
					const rows = await getDb().execute<{ blocked: boolean }>(
						sql`select ${firstPid} = any(pg_blocking_pids(${secondPid})) as blocked`,
					);
					return rows[0].blocked;
				},
				{ timeout: 3000 },
			)
			.toBe(true);
		gate.release.resolve();
		await settled;
		await configure;
		const changes = await repo.listRecentSpellSlotChanges(characterId);
		expect(
			changes.find((event) => event.action === "configured" && event.next.total === 0),
		).toMatchObject({
			previous: { total: 2, used: 1, remaining: 1 },
			next: { total: 0, used: 0, remaining: 0 },
			usedDelta: -1,
		});
		expect((await repo.findCharacterSpellSlots(owner, characterId))?.[0]).toMatchObject({
			total: 0,
			used: 0,
		});
	} finally {
		gate.release.resolve();
		await Promise.allSettled(pending);
		await first.client.end();
		await second.client.end();
	}
});
