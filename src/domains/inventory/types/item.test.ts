import { describe, expect, it } from "vitest";
import {
	CharacterItemFilterSchema,
	InventoryItemBaseSchema,
	InventoryItemSchema,
	JsonObjectSchema,
} from "./item.js";
import { POSTGRES_REAL_MAX, POSTGRES_REAL_MIN_POSITIVE } from "./numeric.js";

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

	it("enforces PostgreSQL real bounds for weight and estimated value", () => {
		const valid = { name: "Rope", type: "equipment", category: "Adventuring Gear" };

		expect(
			InventoryItemBaseSchema.parse({
				...valid,
				weight: POSTGRES_REAL_MAX,
				estimatedValue: POSTGRES_REAL_MAX,
			}),
		).toMatchObject({ weight: POSTGRES_REAL_MAX, estimatedValue: POSTGRES_REAL_MAX });
		expect(() =>
			InventoryItemBaseSchema.parse({ ...valid, weight: POSTGRES_REAL_MAX * 2 }),
		).toThrow();
		expect(() =>
			InventoryItemBaseSchema.parse({ ...valid, estimatedValue: POSTGRES_REAL_MAX * 2 }),
		).toThrow();

		for (const field of ["weight", "estimatedValue"] as const) {
			expect(InventoryItemBaseSchema.parse({ ...valid, [field]: 0 })[field]).toBe(0);
			expect(
				InventoryItemBaseSchema.parse({ ...valid, [field]: POSTGRES_REAL_MIN_POSITIVE })[field],
			).toBe(POSTGRES_REAL_MIN_POSITIVE);
			expect(() =>
				InventoryItemBaseSchema.parse({ ...valid, [field]: Number.MIN_VALUE }),
			).toThrow();
			expect(() =>
				InventoryItemBaseSchema.parse({ ...valid, [field]: POSTGRES_REAL_MIN_POSITIVE / 2 }),
			).toThrow();
		}
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
		expect(() => CharacterItemFilterSchema.parse({ isEquipped: true, equpped: true })).toThrow();
	});

	it("accepts the PostgreSQL integer quantity boundary and rejects overflow", () => {
		const valid = { name: "Rope", type: "equipment", category: "Adventuring Gear" };

		expect(InventoryItemBaseSchema.parse({ ...valid, quantity: 2_147_483_647 }).quantity).toBe(
			2_147_483_647,
		);
		expect(() => InventoryItemBaseSchema.parse({ ...valid, quantity: 2_147_483_648 })).toThrow();
	});

	it("requires one consistent source-agnostic catalogue traceability shape", () => {
		const validTraceability = [
			{ catalogueItemId: null, catalogueSourceKey: null, catalogueRulesVersion: null },
			{
				catalogueItemId,
				catalogueSourceKey: "catalogue.longsword",
				catalogueRulesVersion: "rules-v1",
			},
			{
				catalogueItemId: null,
				catalogueSourceKey: "catalogue.longsword",
				catalogueRulesVersion: "rules-v1",
			},
		] as const;
		const invalidTraceability = [
			{ catalogueItemId: null, catalogueSourceKey: null, catalogueRulesVersion: "rules-v1" },
			{
				catalogueItemId: null,
				catalogueSourceKey: "catalogue.longsword",
				catalogueRulesVersion: null,
			},
			{ catalogueItemId, catalogueSourceKey: null, catalogueRulesVersion: null },
			{ catalogueItemId, catalogueSourceKey: null, catalogueRulesVersion: "rules-v1" },
			{ catalogueItemId, catalogueSourceKey: "catalogue.longsword", catalogueRulesVersion: null },
		] as const;
		const item = {
			id: itemId,
			inventoryScopeId: scopeId,
			name: "Longsword",
			type: "equipment" as const,
			category: "Weapon",
			rarity: null,
			description: null,
			quantity: 1,
			weight: null,
			estimatedValue: null,
			notes: null,
			thumbnailUrl: null,
			properties: {},
			isEquipped: false,
			statModifiers: null,
			statOverrides: null,
			createdAt: "2026-08-29T12:00:00.000Z",
			updatedAt: "2026-08-29T12:00:00.000Z",
		};

		for (const traceability of validTraceability) {
			expect(InventoryItemSchema.safeParse({ ...item, ...traceability }).success).toBe(true);
		}
		for (const traceability of invalidTraceability) {
			expect(InventoryItemSchema.safeParse({ ...item, ...traceability }).success).toBe(false);
		}
	});
});
