import { eq } from "drizzle-orm";
import { expect, it, vi } from "vitest";
import {
	spellcastingConnection,
	spellcastingFixture,
} from "../../../../tests/support/spellcasting-database.js";
import { charactersTable } from "../../characters/schema/index.js";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import { createCharacterSpellSlotRepository, DndApiSpellSlotClientError } from "../repo/index.js";
import { SpellSlotDefaultsUnavailableError } from "../types/index.js";
import { createCharacterSpellSlotService } from "./character-spell-slot-service.js";

const fixture = spellcastingFixture();
it.each([
	"level",
	"class",
])("refetches changed %s outside locks and preserves concurrent usage", async (field) => {
	const { owner, characterId } = await fixture();
	const other = spellcastingConnection();
	const repo = createCharacterSpellSlotRepository();
	try {
		await repo.mutateCharacterSpellSlots(owner, characterId, {
			action: "configured",
			input: { slots: [{ level: 1, total: 3 }] },
		});
		const findDefaultSpellSlots = vi.fn(async () => {
			if (findDefaultSpellSlots.mock.calls.length === 1) {
				await other.db
					.update(charactersTable)
					.set(field === "level" ? { level: 3 } : { className: "Cleric" })
					.where(eq(charactersTable.id, characterId));
				await createCharacterSpellSlotRepository(() => other.db).mutateCharacterSpellSlots(
					owner,
					characterId,
					{ action: "used", input: { level: 1 } },
				);
				return [{ level: 1, total: 99 }];
			}
			return [{ level: 1, total: 4 }];
		});
		const result = await createCharacterSpellSlotService(repo, {
			findDefaultSpellSlots,
		}).applyDefaultSpellSlots(owner, characterId);
		expect(findDefaultSpellSlots).toHaveBeenCalledTimes(2);
		expect(findDefaultSpellSlots).toHaveBeenLastCalledWith(
			field === "class" ? "Cleric" : "Wizard",
			field === "level" ? 3 : 2,
		);
		expect(result.spellSlots[0]).toMatchObject({ total: 4, used: 1, remaining: 3 });
		expect(result.recentSpellSlotChanges.some((event) => event.next.total === 99)).toBe(false);
	} finally {
		await other.client.end();
	}
});
it("bounds repeated context changes to two fetches without writes", async () => {
	const { owner, characterId } = await fixture();
	const other = spellcastingConnection(),
		repo = createCharacterSpellSlotRepository();
	try {
		const findDefaultSpellSlots = vi.fn(async () => {
			await other.db
				.update(charactersTable)
				.set({ level: 2 + findDefaultSpellSlots.mock.calls.length })
				.where(eq(charactersTable.id, characterId));
			return [{ level: 1, total: 4 }];
		});
		await expect(
			createCharacterSpellSlotService(repo, { findDefaultSpellSlots }).applyDefaultSpellSlots(
				owner,
				characterId,
			),
		).rejects.toThrow(SpellSlotDefaultsUnavailableError);
		expect(findDefaultSpellSlots).toHaveBeenCalledTimes(2);
		expect(await repo.listRecentSpellSlotChanges(characterId)).toEqual([]);
		expect(
			(await repo.findCharacterSpellSlots(owner, characterId))?.every((slot) => slot.total === 0),
		).toBe(true);
	} finally {
		await other.client.end();
	}
});
it("denies ownership transferred during fetch and retains remote failure mapping", async () => {
	const { owner, stranger, characterId } = await fixture();
	const other = spellcastingConnection(),
		repo = createCharacterSpellSlotRepository();
	try {
		const findDefaultSpellSlots = vi.fn(async () => {
			await other.db
				.update(charactersTable)
				.set({ userId: stranger })
				.where(eq(charactersTable.id, characterId));
			return [{ level: 1, total: 4 }];
		});
		await expect(
			createCharacterSpellSlotService(repo, { findDefaultSpellSlots }).applyDefaultSpellSlots(
				owner,
				characterId,
			),
		).rejects.toThrow(CharacterNotFoundError);
		expect(findDefaultSpellSlots).toHaveBeenCalledTimes(1);
		expect(await repo.listRecentSpellSlotChanges(characterId)).toEqual([]);
		await expect(
			createCharacterSpellSlotService(repo, {
				findDefaultSpellSlots: async () => {
					throw new DndApiSpellSlotClientError();
				},
			}).applyDefaultSpellSlots(stranger, characterId),
		).rejects.toThrow(SpellSlotDefaultsUnavailableError);
	} finally {
		await other.client.end();
	}
});
