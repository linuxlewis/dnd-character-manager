import { describe, expect, it } from "vitest";
import {
	CharacterItemFilterSchema,
	InventoryItemBaseSchema,
	InventoryItemSchema,
	JsonObjectSchema,
} from "./item.js";

const catalogueItemId = "00000000-0000-4000-8000-000000000010";
const scopeId = "00000000-0000-4000-8000-000000000011";
const itemId = "00000000-0000-4000-8000-000000000012";

describe("inventory item schemas", () => {
	it("accepts legacy-compatible item types and rarities with safe defaults", () => {
		expect(
			InventoryItemBaseSchema.parse({
				name: "Healing Potion",
				type: "potion",
				category: "Potion",
				rarity: "common",
			}),
		).toMatchObject({
			name: "Healing Potion",
			quantity: 1,
			properties: {},
		});
	});

	it("enforces positive quantities and nonnegative weight/value", () => {
		const valid = { name: "Rope", type: "equipment", category: "Adventuring Gear" };

		expect(
			InventoryItemBaseSchema.parse({ ...valid, quantity: 2, weight: 10, estimatedValue: 1.5 }),
		).toMatchObject({
			quantity: 2,
			weight: 10,
			estimatedValue: 1.5,
		});
		expect(() => InventoryItemBaseSchema.parse({ ...valid, quantity: 0 })).toThrow();
		expect(() => InventoryItemBaseSchema.parse({ ...valid, weight: -1 })).toThrow();
		expect(() => InventoryItemBaseSchema.parse({ ...valid, estimatedValue: -0.01 })).toThrow();
	});

	it("requires JSON objects for item properties", () => {
		expect(JsonObjectSchema.parse({ damage: { dice: "1d6" }, tags: ["weapon"] })).toEqual({
			damage: { dice: "1d6" },
			tags: ["weapon"],
		});
		expect(() => JsonObjectSchema.parse({ invalid: undefined })).toThrow();
	});

	it("parses a complete persisted item and typed filters", () => {
		const item = {
			id: itemId,
			inventoryScopeId: scopeId,
			name: "Longsword",
			type: "equipment",
			category: "Weapon",
			rarity: null,
			description: "A versatile martial weapon.",
			quantity: 1,
			weight: 3,
			estimatedValue: 15,
			notes: null,
			thumbnailUrl: null,
			properties: { damage: "1d8" },
			isEquipped: true,
			statModifiers: { attack: 1 },
			statOverrides: null,
			catalogueItemId,
			catalogueSourceKey: "catalogue.longsword",
			catalogueRulesVersion: "2024",
			createdAt: "2026-08-29T12:00:00.000Z",
			updatedAt: "2026-08-29T12:00:00.000Z",
		};

		expect(InventoryItemSchema.parse(item)).toEqual(item);
		expect(
			CharacterItemFilterSchema.parse({ search: "sword", type: "equipment", isEquipped: true }),
		).toEqual({
			search: "sword",
			type: "equipment",
			isEquipped: true,
		});
		expect(() => CharacterItemFilterSchema.parse({ type: "weapon" })).toThrow();
	});

	it("accepts the PostgreSQL integer quantity boundary and rejects overflow", () => {
		const valid = { name: "Rope", type: "equipment", category: "Adventuring Gear" };

		expect(InventoryItemBaseSchema.parse({ ...valid, quantity: 2_147_483_647 }).quantity).toBe(
			2_147_483_647,
		);
		expect(() => InventoryItemBaseSchema.parse({ ...valid, quantity: 2_147_483_648 })).toThrow();
	});
});
