import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createCharacterHealthRepository } from "../repo/character-health-repository.js";
import { createCharacterRepository } from "../repo/character-repository.js";
import { createCharacterHealthService } from "./character-health-service.js";

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

describe("character health service concurrency", () => {
	it("keeps concurrent damage operations and their history", async () => {
		const { repository, service } = createService();
		const { userId, characterId } = await createCharacter(20);

		await Promise.all([
			service.updateCharacterHealth(userId, characterId, healthInput(20, -3)),
			service.updateCharacterHealth(userId, characterId, healthInput(20, -4)),
		]);

		const health = await repository.findCharacterHealth(userId, characterId);
		const changes = await repository.listRecentHealthChanges(characterId);
		expect(health?.currentHp).toBe(13);
		expect(changes.filter((change) => change.currentHpDelta < 0)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ currentHpDelta: -3 }),
				expect.objectContaining({ currentHpDelta: -4 }),
			]),
		);
	});

	it("keeps concurrent heal operations and their history", async () => {
		const { repository, service } = createService();
		const { userId, characterId } = await createCharacter(20);
		await service.updateCharacterHealth(userId, characterId, healthInput(10, -10));

		await Promise.all([
			service.updateCharacterHealth(userId, characterId, healthInput(10, 3)),
			service.updateCharacterHealth(userId, characterId, healthInput(10, 4)),
		]);

		const health = await repository.findCharacterHealth(userId, characterId);
		const changes = await repository.listRecentHealthChanges(characterId);
		expect(health?.currentHp).toBe(17);
		expect(changes.filter((change) => change.currentHpDelta > 0)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ currentHpDelta: 3 }),
				expect.objectContaining({ currentHpDelta: 4 }),
			]),
		);
	});

	it("composes a current edit with concurrent damage without a stale overwrite", async () => {
		const { repository, service } = createService();
		const { userId, characterId } = await createCharacter(20);

		await Promise.all([
			service.updateCharacterHealth(userId, characterId, {
				currentHp: 20,
				maxHp: 25,
				temporaryHp: 5,
				currentHpDelta: 0,
			}),
			service.updateCharacterHealth(userId, characterId, healthInput(20, -3)),
		]);

		const health = await repository.findCharacterHealth(userId, characterId);
		expect(health).toEqual({
			currentHp: 27,
			maxHp: 25,
			temporaryHp: 5,
			effectiveMaxHp: 30,
		});
	});
});

function createService() {
	const repository = createCharacterHealthRepository();
	return { repository, service: createCharacterHealthService(repository) };
}

function healthInput(currentHp: number, currentHpDelta: number) {
	return { currentHp, maxHp: 20, temporaryHp: 0, currentHpDelta };
}

async function createCharacter(maxHp: number) {
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
		name: "Concurrent Health",
		className: "Fighter",
		level: 1,
		maxHp,
	});
	return { userId, characterId: character.id };
}
