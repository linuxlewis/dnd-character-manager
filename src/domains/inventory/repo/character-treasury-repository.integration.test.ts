import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { count, eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCharacterTreasuryRepository } from "./character-treasury-repository.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";
import { inventoryTreasuriesTable } from "./inventory-treasury-table.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
	await getDb().delete(inventoryTreasuriesTable);
	await getDb().delete(inventoryScopesTable);
});

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

describe("character treasury persistence", () => {
	it("applies the migration shape and named database constraints", async () => {
		const columns = await getDb().execute(sql`
			SELECT table_name, column_name, is_nullable, column_default
			FROM information_schema.columns
			WHERE table_name IN ('inventory_scopes', 'inventory_treasuries')
			ORDER BY table_name, ordinal_position
		`);
		const constraints = await getDb().execute(sql`
			SELECT conname, pg_get_constraintdef(oid) AS definition
			FROM pg_constraint
			WHERE conrelid IN ('inventory_scopes'::regclass, 'inventory_treasuries'::regclass)
		`);

		const columnByName = new Map(
			columns.map((row) => [`${row.table_name}.${row.column_name}`, row]),
		);
		expect(columnByName.get("inventory_scopes.id")).toMatchObject({
			is_nullable: "NO",
			column_default: expect.stringContaining("gen_random_uuid"),
		});
		expect(columnByName.get("inventory_scopes.character_id")).toMatchObject({ is_nullable: "NO" });
		expect(columnByName.get("inventory_scopes.created_at")).toMatchObject({
			is_nullable: "NO",
			column_default: expect.stringContaining("now"),
		});
		expect(columnByName.get("inventory_scopes.updated_at")).toMatchObject({
			is_nullable: "NO",
			column_default: expect.stringContaining("now"),
		});
		for (const column of ["inventory_scope_id", "copper", "silver", "gold", "platinum"]) {
			expect(columnByName.get(`inventory_treasuries.${column}`)).toMatchObject({
				is_nullable: "NO",
			});
		}
		for (const column of ["created_at", "updated_at"]) {
			expect(columnByName.get(`inventory_treasuries.${column}`)).toMatchObject({
				is_nullable: "NO",
				column_default: expect.stringContaining("now"),
			});
		}
		for (const column of ["copper", "silver", "gold", "platinum"]) {
			expect(columnByName.get(`inventory_treasuries.${column}`)?.column_default).toBe("0");
		}
		expect(constraints.map((row) => row.conname)).toEqual(
			expect.arrayContaining([
				"inventory_scopes_character_id_fkey",
				"inventory_scopes_character_id_unique",
				"inventory_treasuries_inventory_scope_id_fkey",
				"inventory_treasuries_copper_nonnegative_check",
				"inventory_treasuries_silver_nonnegative_check",
				"inventory_treasuries_gold_nonnegative_check",
				"inventory_treasuries_platinum_nonnegative_check",
			]),
		);
		expect(
			constraints.find((row) => row.conname === "inventory_scopes_character_id_fkey")?.definition,
		).toContain("ON DELETE CASCADE");
		expect(
			constraints.find((row) => row.conname === "inventory_treasuries_inventory_scope_id_fkey")
				?.definition,
		).toContain("ON DELETE CASCADE");
	});

	it("enforces one scope per character", async () => {
		const { characterId } = await createCharacter();
		await getDb().insert(inventoryScopesTable).values({ characterId });

		await expect(
			getDb().insert(inventoryScopesTable).values({ characterId }),
		).rejects.toBeDefined();
	});

	it("reads zero without creating scope or treasury rows", async () => {
		const { characterId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();

		await expect(repository.findCharacterTreasury(characterId)).resolves.toEqual(
			zeroTreasury(characterId),
		);
		await expect(
			countRows(inventoryScopesTable, characterId, inventoryScopesTable.characterId),
		).resolves.toBe(0);
		await expect(
			countRows(inventoryTreasuriesTable, characterId, inventoryTreasuriesTable.inventoryScopeId),
		).resolves.toBe(0);
	});

	it("reads zero for an existing scope without creating a treasury", async () => {
		const { characterId } = await createCharacter();
		await getDb().insert(inventoryScopesTable).values({ characterId });
		const repository = createCharacterTreasuryRepository();

		await expect(repository.findCharacterTreasury(characterId)).resolves.toEqual(
			zeroTreasury(characterId),
		);
		const [rows] = await getDb().select({ count: count() }).from(inventoryTreasuriesTable);
		expect(Number(rows?.count ?? 0)).toBe(0);
	});

	it("returns the strict public shape from persisted rows and validates IDs at the boundary", async () => {
		const { characterId } = await createCharacter();
		const [scope] = await getDb()
			.insert(inventoryScopesTable)
			.values({ characterId })
			.returning({ id: inventoryScopesTable.id });
		await getDb()
			.insert(inventoryTreasuriesTable)
			.values({
				inventoryScopeId: scope.id,
				copper: 7,
				silver: 3,
				gold: 2,
				platinum: 1,
				createdAt: new Date("2026-08-29T12:00:00.000Z"),
				updatedAt: new Date("2026-08-29T12:01:00.000Z"),
			});
		const repository = createCharacterTreasuryRepository();

		const treasury = await repository.findCharacterTreasury(characterId);
		expect(treasury).toEqual({
			characterId,
			balances: { cp: 7, sp: 3, gp: 2, pp: 1 },
			totalValue: { copper: 1_237, gp: 12.37 },
		});
		expect(Object.keys(treasury).sort()).toEqual(["balances", "characterId", "totalValue"]);
		expect("inventoryScopeId" in treasury).toBe(false);

		const mutation = vi.fn(() => ({ cp: 1, sp: 0, gp: 0, pp: 0 }));
		await expect(repository.findCharacterTreasury("not-a-uuid")).rejects.toThrow();
		await expect(repository.mutateCharacterTreasury("not-a-uuid", mutation)).rejects.toThrow();
		expect(mutation).not.toHaveBeenCalled();
	});

	it("creates scope and treasury in the first atomic mutation", async () => {
		const { characterId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();

		await expect(
			repository.mutateCharacterTreasury(characterId, (current) => ({ ...current, gp: 2 })),
		).resolves.toEqual({
			characterId,
			balances: { cp: 0, sp: 0, gp: 2, pp: 0 },
			totalValue: { copper: 200, gp: 2 },
		});
		expect(
			await countRows(inventoryScopesTable, characterId, inventoryScopesTable.characterId),
		).toBe(1);
		const [treasuryCount] = await getDb().select({ count: count() }).from(inventoryTreasuriesTable);
		expect(Number(treasuryCount?.count ?? 0)).toBe(1);

		const invalid = await createCharacter();
		await expect(
			repository.mutateCharacterTreasury(invalid.characterId, () => ({
				cp: -1,
				sp: 0,
				gp: 0,
				pp: 0,
			})),
		).rejects.toBeDefined();
		expect(
			await countRows(inventoryScopesTable, invalid.characterId, inventoryScopesTable.characterId),
		).toBe(0);
	});

	it("serializes concurrent first mutations without lost updates", async () => {
		const { characterId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();
		const mutations = Array.from({ length: 12 }, () =>
			repository.mutateCharacterTreasury(characterId, (current) => ({
				...current,
				cp: current.cp + 1,
			})),
		);

		await Promise.all(mutations);
		await expect(repository.findCharacterTreasury(characterId)).resolves.toMatchObject({
			balances: { cp: 12, sp: 0, gp: 0, pp: 0 },
			totalValue: { copper: 12, gp: 0.12 },
		});
		expect(
			await countRows(inventoryScopesTable, characterId, inventoryScopesTable.characterId),
		).toBe(1);
		const [treasuryCount] = await getDb().select({ count: count() }).from(inventoryTreasuriesTable);
		expect(Number(treasuryCount?.count ?? 0)).toBe(1);
	});

	it("keeps characters isolated and rejects invalid persisted balances", async () => {
		const first = await createCharacter();
		const second = await createCharacter();
		const repository = createCharacterTreasuryRepository();
		await repository.mutateCharacterTreasury(first.characterId, (current) => ({
			...current,
			pp: 1,
		}));

		await expect(repository.findCharacterTreasury(second.characterId)).resolves.toEqual(
			zeroTreasury(second.characterId),
		);
		await expect(
			getDb().execute(sql`
				UPDATE inventory_treasuries
				SET copper = -1
				WHERE inventory_scope_id = (SELECT id FROM inventory_scopes WHERE character_id = ${first.characterId})
			`),
		).rejects.toBeDefined();
		await expect(repository.findCharacterTreasury(first.characterId)).resolves.toMatchObject({
			balances: { cp: 0, sp: 0, gp: 0, pp: 1 },
		});
	});

	it("cascades treasury data when the owning character is deleted", async () => {
		const { characterId } = await createCharacter();
		const repository = createCharacterTreasuryRepository();
		await repository.mutateCharacterTreasury(characterId, (current) => ({ ...current, gp: 1 }));

		await getDb().execute(sql`DELETE FROM characters WHERE id = ${characterId}`);
		expect(
			await countRows(inventoryScopesTable, characterId, inventoryScopesTable.characterId),
		).toBe(0);
		const [treasuryCount] = await getDb().select({ count: count() }).from(inventoryTreasuriesTable);
		expect(Number(treasuryCount?.count ?? 0)).toBe(0);
	});
});

async function createCharacter() {
	const userId = crypto.randomUUID();
	const characterId = crypto.randomUUID();
	createdUserIds.push(userId);
	await getDb()
		.insert(userTable)
		.values({
			id: userId,
			name: "Inventory Test User",
			email: `${userId}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	await getDb().execute(sql`
		INSERT INTO characters (id, user_id, name, class, level)
		VALUES (${characterId}, ${userId}, 'Inventory Test Character', 'Fighter', 1)
	`);
	return { characterId };
}

async function countRows(
	table: typeof inventoryScopesTable | typeof inventoryTreasuriesTable,
	id: string,
	column:
		| typeof inventoryScopesTable.characterId
		| typeof inventoryTreasuriesTable.inventoryScopeId,
) {
	const [row] = await getDb().select({ count: count() }).from(table).where(eq(column, id));
	return Number(row?.count ?? 0);
}

function zeroTreasury(characterId: string) {
	return {
		characterId,
		balances: { cp: 0, sp: 0, gp: 0, pp: 0 },
		totalValue: { copper: 0, gp: 0 },
	};
}
