import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createCharacter } from "../../../application/character-detail/workflows/create-character.js";
import type { CharacterSpellSlotsResponse } from "../types/index.js";
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
		const character = await createCharacter({
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

		await repository.mutateCharacterSpellSlots(userId, character.id, {
			action: "configured",
			input: { slots: [{ level: 1, total: 6 }] },
		});
		let result: CharacterSpellSlotsResponse | undefined;
		for (let index = 1; index <= 6; index++) {
			const response = await repository.mutateCharacterSpellSlots(userId, character.id, {
				action: "used",
				input: { level: 1 },
			});
			if (!response || "status" in response) throw new Error("Expected saved slots");
			result = response;
			await new Promise((resolve) => setTimeout(resolve, 5));
		}

		expect(result?.spellSlots[0]).toEqual({ level: 1, total: 6, used: 6, remaining: 0 });
		expect(result?.recentSpellSlotChanges.map((change) => change.next.used)).toEqual([
			6, 5, 4, 3, 2,
		]);
	});
});

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
