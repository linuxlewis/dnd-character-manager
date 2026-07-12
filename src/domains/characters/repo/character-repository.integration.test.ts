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
			health: { currentHp: 28, maxHp: 28, temporaryHp: 0, effectiveMaxHp: 28 },
		});
	});

	it("transfers all characters from an anonymous user to a linked account", async () => {
		const anonymousUserId = await createUser();
		const linkedUserId = await createUser();
		const repository = createCharacterRepository();
		const firstCharacter = await repository.createCharacter({
			userId: anonymousUserId,
			name: "Mira",
			className: "Fighter",
			level: 3,
			maxHp: 28,
		});
		const secondCharacter = await repository.createCharacter({
			userId: anonymousUserId,
			name: "Nyx",
			className: "Rogue",
			level: 4,
			maxHp: 24,
		});

		await expect(repository.transferCharactersToUser(anonymousUserId, linkedUserId)).resolves.toBe(
			2,
		);

		await expect(repository.listCharacters(anonymousUserId)).resolves.toEqual([]);
		await expect(repository.listCharacters(linkedUserId)).resolves.toEqual([
			{
				id: firstCharacter.id,
				name: "Mira",
				className: "Fighter",
				level: 3,
			},
			{
				id: secondCharacter.id,
				name: "Nyx",
				className: "Rogue",
				level: 4,
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
