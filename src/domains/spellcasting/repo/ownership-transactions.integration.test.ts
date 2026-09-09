import { getDb } from "@providers/database/index.js";
import { eq, sql } from "drizzle-orm";
import { expect, it } from "vitest";
import {
	holdCommit,
	spellcastingConnection,
	spellcastingFixture,
} from "../../../../tests/support/spellcasting-database.js";
import { charactersTable } from "../../characters/schema/index.js";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import { createCharacterSpellService } from "../service/character-spell-service.js";
import { createCharacterSpellRepository } from "./character-spell-repository.js";
import { createCharacterSpellSlotRepository } from "./character-spell-slot-repository.js";
import type { DndApiSpellClient } from "./dnd-api-spell-client.js";

const fixture = spellcastingFixture();
const spell = {
	slotLevel: 1,
	source: "spell" as const,
	spellIndex: "shield",
	name: "Shield",
	level: 1,
	url: "/api/2014/spells/shield",
};
it.each([
	"save",
	"remove",
	"use",
])("holds identity until %s commits, then rejects the former owner", async (action) => {
	const { owner, stranger, characterId } = await fixture();
	const first = spellcastingConnection(),
		second = spellcastingConnection();
	const gate = holdCommit(first.db);
	let mutation: Promise<unknown> | undefined;
	let transfer: Promise<unknown> | undefined;
	try {
		const saved = await createCharacterSpellRepository().saveCharacterSpell(
			owner,
			characterId,
			spell,
		);
		const spellId = saved?.spells[0].id;
		if (!spellId) throw new Error("Missing spell fixture");
		await createCharacterSpellSlotRepository().mutateCharacterSpellSlots(owner, characterId, {
			action: "configured",
			input: { slots: [{ level: 1, total: 2 }] },
		});
		const [{ pid: firstPid }] = await first.client<
			{ pid: number }[]
		>`select pg_backend_pid() as pid`;
		const [{ pid: secondPid }] = await second.client<
			{ pid: number }[]
		>`select pg_backend_pid() as pid`;
		const savedRepo = createCharacterSpellRepository(() => gate.db);
		mutation =
			action === "use"
				? createCharacterSpellSlotRepository(() => gate.db).mutateCharacterSpellSlots(
						owner,
						characterId,
						{ action: "used", input: { level: 1 } },
					)
				: action === "save"
					? savedRepo.saveCharacterSpell(owner, characterId, {
							...spell,
							spellIndex: "sleep",
							name: "Sleep",
						})
					: savedRepo.removeCharacterSpell(owner, characterId, spellId);
		await Promise.race([gate.entered.promise, mutation]);
		transfer =
			second.client`update characters set user_id = ${stranger} where id = ${characterId}`.execute();
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
		await mutation;
		await transfer;
		const repo = createCharacterSpellRepository();
		expect(await repo.saveCharacterSpell(owner, characterId, spell)).toBeNull();
		expect(await repo.removeCharacterSpell(owner, characterId, spellId)).toBeNull();
		const slots = createCharacterSpellSlotRepository();
		for (const request of [
			{ action: "configured" as const, input: { slots: [{ level: 1, total: 8 }] } },
			{ action: "used" as const, input: { level: 1 } },
			{ action: "restored" as const, input: { level: 1 } },
			{
				action: "defaults-applied" as const,
				input: { slots: [{ level: 1, total: 8 }] },
				context: { className: "Wizard" as const, level: 2 },
			},
		])
			expect(await slots.mutateCharacterSpellSlots(owner, characterId, request)).toBeNull();
		const linkedSpells = await repo.listCharacterSpells(stranger, characterId);
		expect(linkedSpells).toHaveLength(action === "save" ? 2 : action === "remove" ? 0 : 1);
		expect((await slots.findCharacterSpellSlots(stranger, characterId))?.[0].used).toBe(
			action === "use" ? 1 : 0,
		);
	} finally {
		gate.release.resolve();
		await Promise.allSettled([mutation, transfer].filter(Boolean));
		await first.client.end();
		await second.client.end();
	}
});
it("denies transfer during saved-spell fetch and preserves duplicate/source/bucket uniqueness", async () => {
	const { owner, stranger, characterId } = await fixture();
	const repo = createCharacterSpellRepository();
	const client: DndApiSpellClient = {
		searchSpells: async () => [],
		getSpellDetails: async () => {
			throw new Error("Unexpected details lookup");
		},
		findSpell: async () => {
			await getDb()
				.update(charactersTable)
				.set({ userId: stranger })
				.where(eq(charactersTable.id, characterId));
			return { ...spell, index: spell.spellIndex };
		},
	};
	await expect(
		createCharacterSpellService(repo, client).saveCharacterSpell(owner, characterId, {
			slotLevel: 1,
			spellIndex: "shield",
			source: "spell",
		}),
	).rejects.toThrow(CharacterNotFoundError);
	expect(await repo.listCharacterSpells(stranger, characterId)).toEqual([]);
	await Promise.all([
		repo.saveCharacterSpell(stranger, characterId, spell),
		repo.saveCharacterSpell(stranger, characterId, spell),
	]);
	await repo.saveCharacterSpell(stranger, characterId, { ...spell, slotLevel: 2 });
	await repo.saveCharacterSpell(stranger, characterId, {
		...spell,
		source: "feature",
		slotLevel: 0,
		url: "/api/2014/features/shield",
	});
	await repo.saveCharacterSpell(stranger, characterId, {
		...spell,
		source: "spell",
		slotLevel: 0,
		level: 0,
	});
	expect(await repo.listCharacterSpells(stranger, characterId)).toHaveLength(4);
	expect(
		(await repo.removeCharacterSpell(stranger, characterId, crypto.randomUUID()))?.spells,
	).toHaveLength(4);
});
