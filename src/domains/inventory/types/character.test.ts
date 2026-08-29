import { describe, expect, it } from "vitest";
import {
	AddCharacterTreasuryPreviewResponseSchema,
	AddCharacterTreasuryRequestSchema,
	AddCharacterTreasuryResponseSchema,
	CharacterItemResponseSchema,
	CharacterTreasuryPreviewResponseSchema,
	CharacterTreasuryResponseSchema,
	CharacterTreasurySchema,
	ConvertCharacterTreasuryRequestSchema,
	CreateCharacterItemRequestSchema,
	ListCharacterItemsResponseSchema,
	SpendCharacterTreasuryPreviewResponseSchema,
	SpendCharacterTreasuryRequestSchema,
	SpendCharacterTreasuryResponseSchema,
	UpdateCharacterItemRequestSchema,
} from "./character.js";
import { InventoryItemSchema } from "./item.js";

const characterId = "00000000-0000-4000-8000-000000000020";
const scopeId = "00000000-0000-4000-8000-000000000021";
const itemId = "00000000-0000-4000-8000-000000000022";

const treasury = {
	characterId,
	balances: { cp: 0, sp: 2, gp: 3, pp: 1 },
	totalValue: { copper: 1_320, gp: 13.2 },
};

describe("character inventory boundary schemas", () => {
	it("accepts a pre-persistence zero treasury without a public scope ID", () => {
		const zeroTreasury = {
			characterId,
			balances: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: { copper: 0, gp: 0 },
		};

		expect(CharacterTreasurySchema.parse(zeroTreasury)).toEqual(zeroTreasury);
		expect(CharacterTreasuryResponseSchema.parse({ treasury: zeroTreasury })).toEqual({
			treasury: zeroTreasury,
		});
	});

	it("parses treasury requests, responses, and previews", () => {
		expect(
			AddCharacterTreasuryRequestSchema.parse({ delta: { cp: 10, sp: 0, gp: 2, pp: 0 } }),
		).toEqual({
			delta: { cp: 10, sp: 0, gp: 2, pp: 0 },
		});
		expect(
			SpendCharacterTreasuryRequestSchema.parse({ amount: { denomination: "gp", amount: 2 } }),
		).toEqual({
			amount: { denomination: "gp", amount: 2 },
		});
		expect(
			ConvertCharacterTreasuryRequestSchema.parse({ from: "pp", to: "gp", amount: 1 }),
		).toEqual({
			from: "pp",
			to: "gp",
			amount: 1,
		});

		expect(CharacterTreasuryResponseSchema.parse({ treasury })).toEqual({ treasury });
		expect(
			CharacterTreasuryPreviewResponseSchema.parse({
				treasury,
				preview: {
					operation: "spend",
					previous: treasury.balances,
					next: treasury.balances,
					delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
					totalValue: treasury.totalValue,
					canApply: true,
				},
			}),
		).toHaveProperty("preview.canApply", true);
	});

	it("keeps add previews strict and spend previews change-aware", () => {
		const addPreview = {
			treasury,
			preview: {
				operation: "add" as const,
				previous: treasury.balances,
				next: { cp: 1, sp: 2, gp: 3, pp: 1 },
				delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
				totalValue: { copper: 1_321, gp: 13.21 },
				canApply: true,
			},
		};
		expect(AddCharacterTreasuryPreviewResponseSchema.parse(addPreview)).toEqual(addPreview);
		expect(() =>
			AddCharacterTreasuryPreviewResponseSchema.parse({
				...addPreview,
				preview: { ...addPreview.preview, change: { cp: 1, sp: 0, gp: 0, pp: 0 } },
			}),
		).toThrow();

		const spendPreview = {
			treasury,
			preview: {
				operation: "spend" as const,
				previous: treasury.balances,
				next: { cp: 0, sp: 7, gp: 2, pp: 1 },
				delta: { cp: 0, sp: 5, gp: 0, pp: 0 },
				totalValue: { copper: 1_320, gp: 13.2 },
				canApply: true,
				change: { cp: 0, sp: 5, gp: 0, pp: 0 },
			},
		};
		expect(SpendCharacterTreasuryPreviewResponseSchema.parse(spendPreview)).toEqual(spendPreview);
		expect(
			SpendCharacterTreasuryPreviewResponseSchema.parse({
				treasury,
				preview: {
					operation: "spend",
					previous: treasury.balances,
					next: treasury.balances,
					delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
					totalValue: treasury.totalValue,
					canApply: false,
					error: {
						code: "INSUFFICIENT_FUNDS",
						message: "The treasury does not contain enough currency.",
						available: { copper: 100, gp: 1 },
						requested: { copper: 200, gp: 2 },
					},
				},
			}),
		).toBeDefined();
	});

	it("parses character item create, update, single, and list shapes", () => {
		const request = CreateCharacterItemRequestSchema.parse({
			name: "Rope",
			type: "equipment",
			category: "Adventuring Gear",
			quantity: 1,
		});
		expect(request.name).toBe("Rope");
		const catalogueRequest = CreateCharacterItemRequestSchema.parse({
			name: "Rope",
			type: "equipment",
			category: "Adventuring Gear",
			catalogueItemId: "00000000-0000-4000-8000-000000000023",
		});
		expect(catalogueRequest.catalogueItemId).toBe("00000000-0000-4000-8000-000000000023");
		expect(UpdateCharacterItemRequestSchema.parse({ quantity: 3 })).toEqual({ quantity: 3 });
		expect(() => UpdateCharacterItemRequestSchema.parse({})).toThrow();
		expect(() =>
			CreateCharacterItemRequestSchema.parse({
				name: "Rope",
				type: "equipment",
				category: "Adventuring Gear",
				catalogueSourceKey: "catalogue.rope",
			}),
		).toThrow();
		expect(() =>
			UpdateCharacterItemRequestSchema.parse({ catalogueSourceKey: "catalogue.rope" }),
		).toThrow();
		expect(() =>
			CreateCharacterItemRequestSchema.parse({
				name: "Rope",
				type: "equipment",
				category: "Adventuring Gear",
				catalogueRulesVersion: "2024",
			}),
		).toThrow();
		expect(() =>
			CreateCharacterItemRequestSchema.parse({
				name: "Rope",
				type: "equipment",
				category: "Adventuring Gear",
				catalogue: { catalogueItemId: "00000000-0000-4000-8000-000000000023" },
			}),
		).toThrow();

		const item = {
			id: itemId,
			inventoryScopeId: scopeId,
			name: "Rope",
			type: "equipment",
			category: "Adventuring Gear",
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
			catalogueItemId: null,
			catalogueSourceKey: null,
			catalogueRulesVersion: null,
			createdAt: "2026-08-29T12:00:00.000Z",
			updatedAt: "2026-08-29T12:00:00.000Z",
		};

		expect(CharacterItemResponseSchema.parse({ item })).toEqual({ item });
		expect(() => InventoryItemSchema.parse({ ...item, catalogue: {} })).toThrow();
		expect(() => CharacterItemResponseSchema.parse({ item, unexpected: true })).toThrow();
		expect(ListCharacterItemsResponseSchema.parse({ items: [item], total: 1 })).toEqual({
			items: [item],
			total: 1,
		});
		expect(() =>
			ListCharacterItemsResponseSchema.parse({ items: [item], total: 1, unexpected: true }),
		).toThrow();
	});

	it("keeps typed add and spend response operations distinct", () => {
		const common = {
			treasury,
			change: {
				operation: "add" as const,
				previous: treasury.balances,
				next: treasury.balances,
				delta: { cp: 10, sp: 0, gp: 0, pp: 0 },
				totalValue: treasury.totalValue,
			},
		};
		expect(AddCharacterTreasuryResponseSchema.parse(common)).toEqual(common);

		const spend = {
			...common,
			change: {
				...common.change,
				operation: "spend" as const,
				spent: { denomination: "gp" as const, amount: 1 },
			},
		};
		expect(SpendCharacterTreasuryResponseSchema.parse(spend)).toEqual(spend);
	});
});
