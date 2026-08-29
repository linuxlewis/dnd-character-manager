import { describe, expect, it } from "vitest";
import {
	AddCharacterTreasuryRequestSchema,
	AddCharacterTreasuryResponseSchema,
	CharacterItemResponseSchema,
	CharacterTreasuryPreviewResponseSchema,
	CharacterTreasuryResponseSchema,
	ConvertCharacterTreasuryRequestSchema,
	CreateCharacterItemRequestSchema,
	ListCharacterItemsResponseSchema,
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
	inventoryScopeId: scopeId,
	balances: { cp: 0, sp: 2, gp: 3, pp: 1 },
	totalValue: { copper: 1_320, gp: 13.2 },
};

describe("character inventory boundary schemas", () => {
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
		expect(ListCharacterItemsResponseSchema.parse({ items: [item], total: 1 })).toEqual({
			items: [item],
			total: 1,
		});
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
