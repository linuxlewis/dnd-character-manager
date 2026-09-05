import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createCharacterRepository } from "../repo/character-repository.js";
import { createCharacterSpellSlotRepository } from "../repo/character-spell-slot-repository.js";
import type { DndApiSpellSlotClient } from "../repo/index.js";
import { createCharacterSpellSlotService } from "./character-spell-slot-service.js";

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

describe("character spell-slot service concurrency", () => {
	it("keeps concurrent use operations and their history", async () => {
		const service = createService();
		const { userId, characterId } = await createCharacter();
		await service.updateCharacterSpellSlots(userId, characterId, {
			slots: [{ level: 1, total: 2 }],
		});

		await Promise.all([
			service.expendCharacterSpellSlot(userId, characterId, { level: 1 }),
			service.expendCharacterSpellSlot(userId, characterId, { level: 1 }),
		]);

		const response = await service.getCharacterSpellSlots(userId, characterId);
		expect(response.spellSlots[0]).toEqual({ level: 1, total: 2, used: 2, remaining: 0 });
		expect(
			response.recentSpellSlotChanges.filter((change) => change.action === "used"),
		).toHaveLength(2);
		expect(response.recentSpellSlotChanges.filter((change) => change.action === "used")).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					previous: expect.objectContaining({ used: 0 }),
					next: expect.objectContaining({ used: 1 }),
				}),
				expect.objectContaining({
					previous: expect.objectContaining({ used: 1 }),
					next: expect.objectContaining({ used: 2 }),
				}),
			]),
		);
	});

	it("keeps concurrent restore operations and their history", async () => {
		const service = createService();
		const { userId, characterId } = await createCharacter();
		await service.updateCharacterSpellSlots(userId, characterId, {
			slots: [{ level: 1, total: 2 }],
		});
		await Promise.all([
			service.expendCharacterSpellSlot(userId, characterId, { level: 1 }),
			service.expendCharacterSpellSlot(userId, characterId, { level: 1 }),
		]);

		await Promise.all([
			service.restoreCharacterSpellSlot(userId, characterId, { level: 1 }),
			service.restoreCharacterSpellSlot(userId, characterId, { level: 1 }),
		]);

		const response = await service.getCharacterSpellSlots(userId, characterId);
		expect(response.spellSlots[0]).toEqual({ level: 1, total: 2, used: 0, remaining: 2 });
		expect(
			response.recentSpellSlotChanges.filter((change) => change.action === "restored"),
		).toHaveLength(2);
	});

	it("composes configuration, defaults, and use transitions", async () => {
		const defaultsClient: DndApiSpellSlotClient = {
			findDefaultSpellSlots: async () => [{ level: 1, total: 4 }],
		};
		const service = createService(defaultsClient);
		const { userId, characterId } = await createCharacter();
		await service.updateCharacterSpellSlots(userId, characterId, {
			slots: [{ level: 1, total: 2 }],
		});

		await Promise.all([
			service.applyDefaultSpellSlots(userId, characterId),
			service.expendCharacterSpellSlot(userId, characterId, { level: 1 }),
		]);

		const response = await service.getCharacterSpellSlots(userId, characterId);
		expect(response.spellSlots[0]).toEqual({ level: 1, total: 4, used: 1, remaining: 3 });
		expect(response.recentSpellSlotChanges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ action: "defaults-applied", totalDelta: 2 }),
				expect.objectContaining({ action: "used", usedDelta: 1 }),
			]),
		);
	});
});

function createService(defaultsClient?: DndApiSpellSlotClient) {
	return createCharacterSpellSlotService(createCharacterSpellSlotRepository(), defaultsClient);
}

async function createCharacter() {
	const userId = crypto.randomUUID();
	createdUserIds.push(userId);
	await getDb()
		.insert(userTable)
		.values({
			id: userId,
			name: "Concurrency User",
			email: `${userId}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	const character = await createCharacterRepository().createCharacter({
		userId,
		name: "Concurrent Slots",
		className: "Wizard",
		level: 7,
		maxHp: 20,
	});
	return { userId, characterId: character.id };
}
