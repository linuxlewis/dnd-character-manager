import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDatabaseUrl, getDb } from "@providers/database/index.js";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, afterEach, expect, it } from "vitest";
import * as schema from "../../database/schema.js";
import { charactersTable } from "../../domains/characters/schema/index.js";
import {
	CharacterNotFoundError,
	requireOwnedCharacter,
} from "../../domains/characters/service/index.js";
import {
	characterHealthEventsTable,
	characterHealthTable,
} from "../../domains/health/schema/index.js";
import { createCharacterHealthService } from "../../domains/health/service/index.js";
import { getCharacter } from "./query.js";
import { createCharacterDetailService } from "./workflows/character-detail.js";
import { createCharacter } from "./workflows/create-character.js";

const users: string[] = [];
afterEach(async () => {
	if (users.length) await getDb().delete(userTable).where(inArray(userTable.id, users));
	users.length = 0;
});
afterAll(closeDb);

it("returns parsed owned detail with newest five events in one executed query for 0, 1 and 7 events", async () => {
	const { owner, other, character, foreign } = await fixture();
	const client = postgres(getDatabaseUrl(), { max: 1 });
	const statements: string[] = [];
	const db = drizzle(client, { schema, logger: { logQuery: (query) => statements.push(query) } });
	try {
		await getDb()
			.update(charactersTable)
			.set({ level: 7, experiencePoints: 27000 })
			.where(eq(charactersTable.id, character.id));
		for (const count of [0, 1, 7]) {
			await getDb()
				.delete(characterHealthEventsTable)
				.where(eq(characterHealthEventsTable.characterId, character.id));
			if (count)
				await getDb()
					.insert(characterHealthEventsTable)
					.values(Array.from({ length: count }, (_, i) => event(character.id, i)));
			statements.length = 0;
			const detail = await getCharacter(owner, character.id, db);
			expect(statements).toHaveLength(1);
			expect(detail).toMatchObject({
				id: character.id,
				experience: { nextLevel: 8, progressPercent: 36, experienceRemaining: 7000 },
				health: { currentHp: 20, maxHp: 20, temporaryHp: 0, effectiveMaxHp: 20 },
			});
			expect(Object.keys(detail).sort()).toEqual(
				[
					"id",
					"name",
					"className",
					"level",
					"experiencePoints",
					"experience",
					"health",
					"recentHealthChanges",
				].sort(),
			);
			expect(detail.recentHealthChanges.map((change) => change.next.currentHp)).toEqual(
				Array.from({ length: Math.min(count, 5) }, (_, i) => count - i),
			);
			expect(detail.health).not.toHaveProperty("characterId");
			expect(detail.recentHealthChanges.every((change) => !("characterId" in change))).toBe(true);
		}
		statements.length = 0;
		await expect(getCharacter(other, character.id, db)).rejects.toThrow(CharacterNotFoundError);
		expect(statements).toHaveLength(1);
		await expect(getCharacter(owner, foreign.id, db)).rejects.toThrow(CharacterNotFoundError);
		await expect(getCharacter(other, foreign.id, db)).resolves.toMatchObject({
			health: { maxHp: 33 },
			recentHealthChanges: [
				expect.objectContaining({
					next: { currentHp: 100, maxHp: 200, temporaryHp: 0, effectiveMaxHp: 200 },
				}),
			],
		});
	} finally {
		await client.end();
	}
});

it("keeps required-health absence as 404 semantics and does not disguise malformed data", async () => {
	const { owner, character } = await fixture();
	await getDb()
		.update(characterHealthTable)
		.set({ maxHp: 10000 })
		.where(eq(characterHealthTable.characterId, character.id));
	await expect(getCharacter(owner, character.id)).rejects.toThrow();
	await getDb()
		.delete(characterHealthTable)
		.where(eq(characterHealthTable.characterId, character.id));
	await expect(getCharacter(owner, character.id)).rejects.toThrow(CharacterNotFoundError);
	await expect(requireOwnedCharacter(owner, character.id)).resolves.toMatchObject({
		id: character.id,
	});
	await expect(
		createCharacterHealthService().updateCharacterHealth(owner, character.id, {
			currentHp: 1,
			maxHp: 20,
			temporaryHp: 0,
		}),
	).rejects.toThrow(CharacterNotFoundError);
	await expect(
		createCharacterDetailService().updateCharacterName(owner, character.id, {
			name: " Still committed ",
		}),
	).rejects.toThrow(CharacterNotFoundError);
	await expect(requireOwnedCharacter(owner, character.id)).resolves.toMatchObject({
		name: "Still committed",
	});
});

it("returns five recent events from real health mutations without recording no-ops", async () => {
	const { owner, character } = await fixture();
	const service = createCharacterHealthService();
	for (let i = 1; i <= 6; i++) {
		const result = await service.updateCharacterHealth(owner, character.id, {
			currentHp: 20 - i,
			maxHp: 20,
			temporaryHp: 0,
		});
		expect(result.recentHealthChanges).toHaveLength(Math.min(i, 5));
		const current = result.recentHealthChanges.find((change) => change.next.currentHp === 20 - i);
		expect(current).toBeDefined();
		await getDb()
			.update(characterHealthEventsTable)
			.set({ createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)) })
			.where(eq(characterHealthEventsTable.id, current?.id ?? ""));
	}
	const result = await service.updateCharacterHealth(owner, character.id, {
		currentHp: 14,
		maxHp: 20,
		temporaryHp: 0,
	});
	expect(result.recentHealthChanges.map((change) => change.next.currentHp)).toEqual([
		14, 15, 16, 17, 18,
	]);
	expect(await getCharacter(owner, character.id)).toMatchObject({
		health: { currentHp: 14 },
		recentHealthChanges: result.recentHealthChanges,
	});
});

function event(characterId: string, index: number) {
	return {
		characterId,
		previousCurrentHp: index,
		nextCurrentHp: index + 1,
		previousMaxHp: 200,
		nextMaxHp: 200,
		previousTemporaryHp: 0,
		nextTemporaryHp: 0,
		currentHpDelta: 1,
		maxHpDelta: 0,
		temporaryHpDelta: 0,
		createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
	};
}
async function fixture() {
	const owner = crypto.randomUUID(),
		other = crypto.randomUUID();
	users.push(owner, other);
	await getDb()
		.insert(userTable)
		.values([owner, other].map((id) => ({ id, name: "Detail", email: `${id}@example.test` })));
	const character = await createCharacter({
		userId: owner,
		name: "Detail",
		className: "Cleric",
		level: 2,
		maxHp: 20,
	});
	const foreign = await createCharacter({
		userId: other,
		name: "Other",
		className: "Wizard",
		level: 3,
		maxHp: 33,
	});
	await getDb().insert(characterHealthEventsTable).values(event(foreign.id, 99));
	return { owner, other, character, foreign };
}
