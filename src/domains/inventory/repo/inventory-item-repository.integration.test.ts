import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { count, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createInventoryItemRepository } from "./inventory-item-repository.js";
import { inventoryItemsTable } from "./inventory-item-table.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
});

afterAll(async () => closeDb());

describe("inventory item persistence", () => {
	it("supports CRUD, filters, and strict scope isolation", async () => {
		const first = await createScope();
		const second = await createScope();
		const repository = createInventoryItemRepository();
		const firstItem = await repository.createItem(first.scopeId, {
			name: "Rope",
			type: "equipment",
			category: "Adventuring Gear",
			quantity: 2,
			properties: { lengthFeet: 50 },
			statModifiers: { athletics: 1 },
		});
		const secondItem = await repository.createItem(second.scopeId, {
			name: "Rope",
			type: "misc",
			category: "Tool",
		});
		await repository.createItem(first.scopeId, {
			name: "Healing Potion",
			type: "potion",
			category: "Potion",
			rarity: "common",
		});

		expect((await repository.listItems(first.scopeId)).total).toBe(2);
		expect(
			(await repository.listItems(first.scopeId, { type: "potion", category: "Potion" })).items,
		).toHaveLength(1);
		expect((await repository.listItems(first.scopeId, { search: "rope" })).items[0]?.id).toBe(
			firstItem.id,
		);
		expect(await repository.findItem(second.scopeId, firstItem.id)).toBeNull();
		expect(await repository.updateItem(second.scopeId, firstItem.id, { quantity: 9 })).toBeNull();
		expect(await repository.deleteItem(second.scopeId, firstItem.id)).toBeNull();
		expect(await repository.findItem(second.scopeId, secondItem.id)).toMatchObject({
			name: "Rope",
			inventoryScopeId: second.scopeId,
		});

		const updated = await repository.updateItem(first.scopeId, firstItem.id, {
			quantity: 4,
			isEquipped: true,
			statOverrides: { armorClass: 18 },
		});
		expect(updated).toMatchObject({
			quantity: 4,
			isEquipped: true,
			statOverrides: { armorClass: 18 },
		});
		expect(await repository.deleteItem(first.scopeId, firstItem.id)).toMatchObject({
			id: firstItem.id,
		});
		expect(await repository.findItem(first.scopeId, firstItem.id)).toBeNull();
	});

	it("enforces database quantity/type constraints", async () => {
		const { scopeId } = await createScope();
		await expect(
			getDb().execute(sql`
				INSERT INTO inventory_items (inventory_scope_id, name, type, category, quantity)
				VALUES (${scopeId}, 'Invalid quantity', 'equipment', 'Misc', 0)
			`),
		).rejects.toBeDefined();
		await expect(
			getDb().execute(sql`
				INSERT INTO inventory_items (inventory_scope_id, name, type, category)
				VALUES (${scopeId}, 'Invalid type', 'weapon', 'Weapon')
			`),
		).rejects.toBeDefined();
	});

	it("treats category filters as literal case-insensitive values", async () => {
		const { scopeId } = await createScope();
		const repository = createInventoryItemRepository();
		await repository.createItem(scopeId, {
			name: "Healing Potion",
			type: "potion",
			category: "Potion",
		});
		await repository.createItem(scopeId, {
			name: "Rope",
			type: "equipment",
			category: "Adventuring Gear",
		});

		expect((await repository.listItems(scopeId, { category: "pOtIoN" })).items).toHaveLength(1);
		expect((await repository.listItems(scopeId, { category: "%" })).items).toHaveLength(0);
		expect((await repository.listItems(scopeId, { category: "_" })).items).toHaveLength(0);
	});

	it("nulls a removed catalogue reference while preserving snapshots", async () => {
		const { scopeId } = await createScope();
		const catalogueItemId = crypto.randomUUID();
		const itemId = crypto.randomUUID();
		await getDb().transaction(async (tx) => {
			await tx.execute(sql`
				INSERT INTO catalogue_items (
					id, source, source_key, source_path, source_revision, source_url, rules_version,
					license, seed_capability, seed_pack, seed_metadata, item_identifier, item_name,
					item_kind, item_category, item_description, is_magical, item_rarity,
					requires_attunement, properties, stats, source_payload
				) VALUES (
					${catalogueItemId}, 'foundry-dnd5e', ${`inventory-test-${catalogueItemId}`},
					'packs/_source/equipment24/inventory-test.yml',
					'0123456789abcdef0123456789abcdef01234567',
					'https://raw.githubusercontent.com/foundryvtt/dnd5e/0123456789abcdef0123456789abcdef01234567/packs/_source/equipment24/inventory-test.yml',
					'2024', 'CC-BY-4.0', 'equipment', 'equipment24', '{}'::jsonb,
					'inventory-test', 'Snapshot Rope', 'adventuring-gear', 'Adventuring Gear',
					'A rope snapshot.', false, null, false, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb
				)
			`);
			await tx.execute(sql`
				INSERT INTO inventory_items (
					id, inventory_scope_id, name, type, category, catalogue_item_id,
					catalogue_source_key, catalogue_rules_version
				) VALUES (
					${itemId}, ${scopeId}, 'Snapshot Rope', 'equipment', 'Adventuring Gear',
					${catalogueItemId}, 'equipment.snapshot-rope', '2024'
				)
			`);
			await tx.execute(sql`DELETE FROM catalogue_items WHERE id = ${catalogueItemId}`);
		});
		const repository = createInventoryItemRepository();
		expect(await repository.findItem(scopeId, itemId)).toMatchObject({
			id: itemId,
			catalogueItemId: null,
			catalogueSourceKey: "equipment.snapshot-rope",
			catalogueRulesVersion: "2024",
		});
	});

	it("cascades items when the inventory scope is deleted", async () => {
		const { scopeId } = await createScope();
		const repository = createInventoryItemRepository();
		await repository.createItem(scopeId, {
			name: "Cascade Item",
			type: "misc",
			category: "Misc",
		});
		await getDb().delete(inventoryScopesTable).where(eq(inventoryScopesTable.id, scopeId));
		const [remaining] = await getDb()
			.select({ value: count() })
			.from(inventoryItemsTable)
			.where(eq(inventoryItemsTable.inventoryScopeId, scopeId));
		expect(Number(remaining?.value ?? 0)).toBe(0);
	});
});

async function createScope() {
	const userId = crypto.randomUUID();
	const characterId = crypto.randomUUID();
	const scopeId = crypto.randomUUID();
	createdUserIds.push(userId);
	await getDb()
		.insert(userTable)
		.values({
			id: userId,
			name: "Inventory Item Test User",
			email: `${userId}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	await getDb().execute(sql`
		INSERT INTO characters (id, user_id, name, class, level)
		VALUES (${characterId}, ${userId}, 'Inventory Item Test Character', 'Fighter', 1)
	`);
	await getDb().insert(inventoryScopesTable).values({ id: scopeId, characterId });
	return { scopeId };
}
