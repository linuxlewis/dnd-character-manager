import { closeDb, getDatabaseUrl, getDb } from "@providers/database/index.js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCharacterRepo } from "./character-repo.js";
import { characterAttributesTable, characterHealthTable } from "./character-table.js";

const sql = postgres(getDatabaseUrl(), { max: 1 });
const createdUserIds: string[] = [];

beforeEach(async () => {
	await cleanupCreatedUsers();
});

afterEach(async () => {
	await cleanupCreatedUsers();
});

async function cleanupCreatedUsers() {
	try {
		for (const userId of createdUserIds) {
			await sql`DELETE FROM "user" WHERE id = ${userId}`;
		}
	} finally {
		createdUserIds.length = 0;
	}
}

afterAll(async () => {
	await closeDb();
	await sql.end();
});

describe("createCharacterRepo", () => {
	it("creates, lists, and finds characters scoped to one user", async () => {
		const userId = await createUser();
		const otherUserId = await createUser();
		const repo = createCharacterRepo();

		const first = await repo.create({
			userId,
			name: "Mira",
			class: "Rogue",
			level: 2,
		});
		await new Promise((resolve) => setTimeout(resolve, 5));
		const second = await repo.create({
			userId,
			name: "Mira",
			class: "Wizard",
			level: 3,
		});
		await expect(
			getDb()
				.select({
					currentHp: characterHealthTable.currentHp,
					maxHp: characterHealthTable.maxHp,
					strength: characterAttributesTable.strength,
					dexterity: characterAttributesTable.dexterity,
					constitution: characterAttributesTable.constitution,
					intelligence: characterAttributesTable.intelligence,
					wisdom: characterAttributesTable.wisdom,
					charisma: characterAttributesTable.charisma,
				})
				.from(characterHealthTable)
				.innerJoin(
					characterAttributesTable,
					eq(characterAttributesTable.characterId, characterHealthTable.characterId),
				)
				.where(eq(characterHealthTable.characterId, second.id)),
		).resolves.toEqual([
			{
				currentHp: 1,
				maxHp: 1,
				strength: 10,
				dexterity: 10,
				constitution: 10,
				intelligence: 10,
				wisdom: 10,
				charisma: 10,
			},
		]);
		await repo.create({
			userId: otherUserId,
			name: "Hidden",
			class: "Wizard",
			level: 1,
		});

		await expect(repo.findByIdForUser({ id: first.id, userId })).resolves.toMatchObject({
			name: "Mira",
			class: "Rogue",
			level: 2,
			experiencePoints: 0,
		});
		await expect(repo.findByIdForUser({ id: first.id, userId: otherUserId })).resolves.toBeNull();
		await expect(repo.listByUser(userId)).resolves.toMatchObject([
			{ id: second.id, name: "Mira", experiencePoints: 0 },
			{ id: first.id, name: "Mira", experiencePoints: 0 },
		]);
	});
});

async function createUser() {
	const [user] = await sql<{ id: string }[]>`
		INSERT INTO "user" (name, email, is_anonymous)
		VALUES ('Anonymous', ${`${crypto.randomUUID()}@anonymous.local`}, true)
		RETURNING id
	`;

	if (!user) throw new Error("User insert did not return a row.");
	createdUserIds.push(user.id);
	return user.id;
}
