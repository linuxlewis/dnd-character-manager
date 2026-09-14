import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, expectTypeOf, it } from "vitest";
import { closeDb, getDatabaseUrl, getDb } from "../providers/database/index.js";
import * as schema from "./schema.js";

it("loads isolated character relations with typed database and transaction queries", async () => {
	const userId = randomUUID();
	const characterId = randomUUID();
	const strangerId = randomUUID();
	const strangerCharacterId = randomUUID();
	const emptyId = randomUUID();
	const statements: string[] = [];
	const client = postgres(getDatabaseUrl(), { max: 1 });
	const countedDb = drizzle(client, {
		schema,
		logger: {
			logQuery(query) {
				statements.push(query);
			},
		},
	});
	const db = getDb();
	try {
		await db.insert(schema.userTable).values([
			{ id: userId, name: "Relations", email: `${userId}@example.test` },
			{ id: strangerId, name: "Stranger", email: `${strangerId}@example.test` },
		]);
		await db.insert(schema.charactersTable).values([
			{ id: characterId, userId, name: "Wizard", className: "Wizard", level: 1 },
			{ id: emptyId, userId, name: "Empty", className: "Fighter", level: 1 },
			{
				id: strangerCharacterId,
				userId: strangerId,
				name: "Stranger",
				className: "Wizard",
				level: 1,
			},
		]);
		await db.insert(schema.characterHealthTable).values([
			{ characterId, currentHp: 7, maxHp: 8 },
			{ characterId: strangerCharacterId, currentHp: 20, maxHp: 20 },
		]);
		await db.insert(schema.characterSpellSlotsTable).values([
			{ characterId, spellLevel: 1, totalSlots: 2 },
			{ characterId: strangerCharacterId, spellLevel: 1, totalSlots: 9 },
		]);
		await db.insert(schema.characterSpellsTable).values([
			{
				characterId,
				slotLevel: 1,
				spellIndex: "shield",
				spellName: "Shield",
				spellLevel: 1,
				spellUrl: "/shield",
			},
			{
				characterId: strangerCharacterId,
				slotLevel: 1,
				spellIndex: "sleep",
				spellName: "Sleep",
				spellLevel: 1,
				spellUrl: "/sleep",
			},
		]);
		const where = and(
			eq(schema.charactersTable.id, characterId),
			eq(schema.charactersTable.userId, userId),
		);
		const character = await countedDb.query.charactersTable.findFirst({
			where,
			with: { health: true, spellSlots: true, spells: true, inventoryScope: true },
		});
		expect(statements).toHaveLength(1);
		expect(character?.health).toMatchObject({ currentHp: 7 });
		expect(character?.spellSlots).toMatchObject([{ spellLevel: 1, totalSlots: 2 }]);
		expect(character?.spells).toMatchObject([{ spellName: "Shield" }]);
		expect(character?.inventoryScope).toBeNull();
		expectTypeOf(character?.health?.currentHp).toEqualTypeOf<number | undefined>();
		expect(
			await db.query.charactersTable.findFirst({
				where: and(
					eq(schema.charactersTable.id, characterId),
					eq(schema.charactersTable.userId, strangerId),
				),
				with: { health: true, spells: true },
			}),
		).toBeUndefined();
		const empty = await db.query.charactersTable.findFirst({
			where: eq(schema.charactersTable.id, emptyId),
			with: { health: true, spells: true, spellSlots: true },
		});
		expect(empty).toMatchObject({ health: null, spells: [], spellSlots: [] });
		await db.transaction(async (tx) => {
			const result = await tx.query.charactersTable.findFirst({
				where,
				with: { health: true, spells: true },
			});
			expectTypeOf(result?.spells[0]?.spellName).toEqualTypeOf<string | undefined>();
			expect(result?.health?.currentHp).toBe(7);
		});
		await closeDb();
		expect(getDb()).not.toBe(db);
		expect(
			await getDb().query.charactersTable.findFirst({ where, with: { health: true } }),
		).toMatchObject({ health: { currentHp: 7 } });
	} finally {
		await client.end();
		await getDb()
			.delete(schema.userTable)
			.where(inArray(schema.userTable.id, [userId, strangerId]));
		await closeDb();
	}
});
