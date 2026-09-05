import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import type { CharacterHealth } from "../types/index.js";
import { createCharacterHealthRepository } from "./character-health-repository.js";
import { createCharacterRepository } from "./character-repository.js";

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

describe("createCharacterHealthRepository", () => {
	it("finds owned health and saves only the latest five health changes", async () => {
		const userId = await createUser();
		const characterRepository = createCharacterRepository();
		const healthRepository = createCharacterHealthRepository();
		const created = await characterRepository.createCharacter({
			userId,
			name: "Perrin",
			className: "Cleric",
			level: 2,
			maxHp: 18,
		});

		await expect(healthRepository.findCharacterHealth(userId, created.id)).resolves.toEqual({
			currentHp: 18,
			maxHp: 18,
			temporaryHp: 0,
			effectiveMaxHp: 18,
		});
		await expect(
			healthRepository.findCharacterHealth(crypto.randomUUID(), created.id),
		).resolves.toBeNull();

		let result = null;
		for (let index = 1; index <= 6; index += 1) {
			const next: CharacterHealth = {
				currentHp: 18 - index,
				maxHp: 18,
				temporaryHp: 0,
				effectiveMaxHp: 18,
			};
			result = await healthRepository.mutateCharacterHealth(userId, created.id, (current) => ({
				health: next,
				change: {
					previous: current,
					next,
					currentHpDelta: next.currentHp - current.currentHp,
					maxHpDelta: 0,
					temporaryHpDelta: 0,
				},
			}));
			await new Promise((resolve) => setTimeout(resolve, 5));
		}

		expect(result).toMatchObject({
			health: {
				currentHp: 12,
				maxHp: 18,
				temporaryHp: 0,
				effectiveMaxHp: 18,
			},
		});
		expect(result?.recentHealthChanges.map((change) => change.next.currentHp)).toEqual([
			12, 13, 14, 15, 16,
		]);
		await expect(healthRepository.findCharacterHealth(userId, created.id)).resolves.toEqual({
			currentHp: 12,
			maxHp: 18,
			temporaryHp: 0,
			effectiveMaxHp: 18,
		});
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
