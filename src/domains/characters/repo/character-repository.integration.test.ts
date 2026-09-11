import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { withTransactionFailure } from "./character-attributes-repository-test-helpers.js";
import { createCharacterRepository } from "./character-repository.js";
import {
	characterAttributesTable,
	characterHealthTable,
	charactersTable,
} from "./character-table.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
	await cleanupCreatedUsers();
});

afterEach(async () => {
	await cleanupCreatedUsers();
});

async function cleanupCreatedUsers() {
	if (createdUserIds.length === 0) return;
	try {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
	} finally {
		createdUserIds.length = 0;
	}
}

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
			experiencePoints: 0,
			experience: {
				level: 3,
				experiencePoints: 0,
				currentLevelMinimum: 900,
				nextLevel: 4,
				nextLevelMinimum: 2_700,
				experienceIntoLevel: 0,
				experienceForNextLevel: 1_800,
				experienceRemaining: 2_700,
				progressPercent: 0,
				isMaxLevel: false,
			},
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
			experiencePoints: 0,
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

		const updatedExperience = await repository.updateCharacterExperience(
			userId,
			created.id,
			27_000,
		);

		expect(updatedExperience).toMatchObject({
			id: created.id,
			name: "Mira Dawn",
			level: 8,
			experiencePoints: 27_000,
			experience: {
				level: 8,
				currentLevelMinimum: 34_000,
				nextLevel: 9,
				progressPercent: 0,
			},
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

	it("rolls back character creation when attribute initialization fails after health", async () => {
		const userId = await createUser();
		const repository = createCharacterRepository(
			undefined,
			withTransactionFailure(getDb(), "insert", 3),
		);

		await expect(
			repository.createCharacter({
				userId,
				name: "Rollback",
				className: "Fighter",
				level: 1,
				maxHp: 10,
			}),
		).rejects.toThrow("Injected transaction failure");

		await expect(
			getDb()
				.select({ id: charactersTable.id })
				.from(charactersTable)
				.where(eq(charactersTable.userId, userId)),
		).resolves.toEqual([]);
		await expect(
			getDb()
				.select({ characterId: characterHealthTable.characterId })
				.from(characterHealthTable)
				.innerJoin(charactersTable, eq(charactersTable.id, characterHealthTable.characterId))
				.where(eq(charactersTable.userId, userId)),
		).resolves.toEqual([]);
		await expect(
			getDb()
				.select({ characterId: characterAttributesTable.characterId })
				.from(characterAttributesTable)
				.innerJoin(charactersTable, eq(charactersTable.id, characterAttributesTable.characterId))
				.where(eq(charactersTable.userId, userId)),
		).resolves.toEqual([]);
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
