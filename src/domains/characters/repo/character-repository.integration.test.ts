import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
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

describe("createCharacterRepository", () => {
	it("creates, lists, and loads a session-owned character with initialized health", async () => {
		const userId = await createUser();
		const repository = createCharacterRepository();

		const created = await repository.createCharacter({
			userId,
			name: "Mira",
			className: "Fighter",
			level: 3,
			maxHp: 28,
		});

		expect(created).toMatchObject({
			name: "Mira",
			className: "Fighter",
			level: 3,
			health: {
				currentHp: 28,
				maxHp: 28,
				temporaryHp: 0,
				effectiveMaxHp: 28,
			},
			recentHealthChanges: [],
		});
		await expect(repository.listCharacters(userId)).resolves.toEqual([
			{
				id: created.id,
				name: "Mira",
				className: "Fighter",
				level: 3,
			},
		]);
		await expect(repository.findCharacterDetail(userId, created.id)).resolves.toMatchObject({
			id: created.id,
			level: 3,
			health: { currentHp: 28, maxHp: 28, temporaryHp: 0, effectiveMaxHp: 28 },
		});

		const updated = await repository.updateCharacterLevel(userId, created.id, 8);

		expect(updated).toMatchObject({
			id: created.id,
			name: "Mira",
			className: "Fighter",
			level: 8,
			health: {
				currentHp: 28,
				maxHp: 28,
				temporaryHp: 0,
				effectiveMaxHp: 28,
			},
		});
		await expect(repository.listCharacters(userId)).resolves.toEqual([
			{
				id: created.id,
				name: "Mira",
				className: "Fighter",
				level: 8,
			},
		]);

		const renamed = await repository.updateCharacterName(userId, created.id, "Mira Dawn");

		expect(renamed).toMatchObject({
			id: created.id,
			name: "Mira Dawn",
			className: "Fighter",
			level: 8,
			health: {
				currentHp: 28,
				maxHp: 28,
				temporaryHp: 0,
				effectiveMaxHp: 28,
			},
		});
		await expect(repository.listCharacters(userId)).resolves.toEqual([
			{
				id: created.id,
				name: "Mira Dawn",
				className: "Fighter",
				level: 8,
			},
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
