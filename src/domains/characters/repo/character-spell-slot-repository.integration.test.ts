import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import type { CharacterSpellSlot } from "../types/index.js";
import { createCharacterRepository } from "./character-repository.js";
import { createCharacterSpellSlotRepository } from "./character-spell-slot-repository.js";

const createdUserIds: string[] = [];

afterEach(async () => {
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
});

afterAll(async () => {
	await closeDb();
});

describe("createCharacterSpellSlotRepository", () => {
	it("returns empty owned spell slots, saves slot usage, and lists recent history", async () => {
		const userId = await createUser();
		const character = await createCharacterRepository().createCharacter({
			userId,
			name: "Tamsin",
			className: "Wizard",
			level: 7,
			maxHp: 30,
		});
		const repository = createCharacterSpellSlotRepository();

		await expect(repository.findCharacterSpellSlots(userId, character.id)).resolves.toEqual(
			Array.from({ length: 9 }, (_, index) => ({
				level: index + 1,
				total: 0,
				used: 0,
				remaining: 0,
			})),
		);
		await expect(
			repository.findCharacterSpellSlots(crypto.randomUUID(), character.id),
		).resolves.toBeNull();
		await expect(repository.findCharacterSpellSlotContext(userId, character.id)).resolves.toEqual({
			className: "Wizard",
			level: 7,
		});

		let previous = emptySlots();
		let result = null;
		for (let index = 1; index <= 6; index += 1) {
			const next = previous.map((slot) =>
				slot.level === 1 ? { ...slot, total: 6, used: index, remaining: 6 - index } : slot,
			);
			result = await repository.saveCharacterSpellSlots(userId, character.id, next, [
				{
					action: "used",
					level: 1,
					previous: previous[0],
					next: next[0],
					totalDelta: 0,
					usedDelta: 1,
				},
			]);
			previous = next;
			await new Promise((resolve) => setTimeout(resolve, 5));
		}

		expect(result?.spellSlots[0]).toEqual({ level: 1, total: 6, used: 6, remaining: 0 });
		expect(result?.recentSpellSlotChanges.map((change) => change.next.used)).toEqual([
			6, 5, 4, 3, 2,
		]);
	});
});

function emptySlots(): CharacterSpellSlot[] {
	return Array.from({ length: 9 }, (_, index) => ({
		level: index + 1,
		total: 0,
		used: 0,
		remaining: 0,
	}));
}

async function createUser() {
	const id = crypto.randomUUID();
	createdUserIds.push(id);
	await getDb()
		.insert(userTable)
		.values({
			id,
			name: "Test User",
			email: `${id}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	return id;
}
