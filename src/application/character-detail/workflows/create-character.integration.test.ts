import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, expect, it } from "vitest";
import { charactersTable } from "../../../domains/characters/schema/index.js";
import { characterHealthTable } from "../../../domains/health/schema/index.js";

import { initializeCharacterHealth } from "../../../domains/health/service/index.js";
import { createCharacter } from "./create-character.js";

const userIds: string[] = [];
afterEach(async () => {
	if (userIds.length) await getDb().delete(userTable).where(inArray(userTable.id, userIds));
	userIds.length = 0;
});
afterAll(closeDb);

it("creates identity and initial health through the application workflow", async () => {
	const input = await newCharacterInput();
	const character = await createCharacter(input);
	expect(character).toMatchObject({
		name: "Mira",
		className: "Wizard",
		level: 2,
		experiencePoints: 0,
		health: { currentHp: 18, maxHp: 18, temporaryHp: 0, effectiveMaxHp: 18 },
		recentHealthChanges: [],
	});
	const [row] = await getDb()
		.select()
		.from(charactersTable)
		.where(eq(charactersTable.id, character.id));
	expect(row.userId).toBe(input.userId);
});

it("rolls back both real inserts when health initialization throws after writing", async () => {
	const input = await newCharacterInput();
	let insertedId = "";
	await expect(
		createCharacter(input, async (id, maxHp, transaction) => {
			insertedId = id;
			await initializeCharacterHealth(id, maxHp, transaction);
			const [identity] = await transaction
				.select()
				.from(charactersTable)
				.where(eq(charactersTable.id, id));
			const [health] = await transaction
				.select()
				.from(characterHealthTable)
				.where(eq(characterHealthTable.characterId, id));
			expect(identity.userId).toBe(input.userId);
			expect(health.currentHp).toBe(18);
			throw new Error("Failure after health insert");
		}),
	).rejects.toThrow("Failure after health insert");
	expect(insertedId).not.toBe("");
	expect(
		await getDb().select().from(charactersTable).where(eq(charactersTable.id, insertedId)),
	).toEqual([]);
	expect(
		await getDb()
			.select()
			.from(characterHealthTable)
			.where(eq(characterHealthTable.characterId, insertedId)),
	).toEqual([]);
});

it("rolls back identity when the health initializer rejects before inserting", async () => {
	const input = await newCharacterInput();
	await expect(createCharacter({ ...input, maxHp: 0 })).rejects.toThrow();
	expect(
		await getDb().select().from(charactersTable).where(eq(charactersTable.userId, input.userId)),
	).toEqual([]);
});

async function newCharacterInput() {
	const userId = crypto.randomUUID();
	userIds.push(userId);
	await getDb()
		.insert(userTable)
		.values({ id: userId, name: "Creator", email: `${userId}@example.test` });
	return { userId, name: " Mira ", className: "Wizard" as const, level: 2, maxHp: 18 };
}
