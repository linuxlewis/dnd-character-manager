import { describe, expect, it, vi } from "vitest";
import { CatalogueItemsUnavailableError } from "../../catalogue/service/index.js";
import { createCatalogueItemClient } from "./catalogue-item-client.js";
import { CatalogueItemClientUnavailableError } from "./character-item-errors.js";

const catalogueItem = {
	id: "00000000-0000-4000-8000-000000000010",
	source: "foundry-dnd5e" as const,
	sourceKey: "phbwepLongsword",
	sourcePath: "packs/_source/equipment24/weapons/longsword.yml",
	rulesVersion: "2024" as const,
	license: "CC-BY-4.0",
	sourcePayload: {},
	sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
	sourceUrl:
		"https://raw.githubusercontent.com/foundryvtt/dnd5e/f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6/packs/_source/equipment24/weapons/longsword.yml",
	capability: "equipment" as const,
	pack: "equipment24" as const,
	seedMetadata: {},
	identifier: "longsword",
	name: "Longsword",
	kind: "weapon" as const,
	category: "Weapons",
	description: "A martial weapon.",
	isMagical: false,
	rarity: null,
	requiresAttunement: false,
	costValue: 15,
	costDenomination: "gp",
	weight: 3,
	thumbnailUrl: null,
	properties: [],
	stats: {},
};

describe("createCatalogueItemClient", () => {
	it("exposes only normalized fields needed by inventory", async () => {
		const service = { getItemDetails: vi.fn().mockResolvedValue(catalogueItem) };
		const client = createCatalogueItemClient({ catalogueService: service });

		await expect(client.getItemDetails(catalogueItem.id)).resolves.toEqual({
			id: catalogueItem.id,
			sourceKey: catalogueItem.sourceKey,
			rulesVersion: catalogueItem.rulesVersion,
			name: catalogueItem.name,
			kind: catalogueItem.kind,
			category: catalogueItem.category,
			description: catalogueItem.description,
			isMagical: catalogueItem.isMagical,
			rarity: catalogueItem.rarity,
			requiresAttunement: catalogueItem.requiresAttunement,
			costValue: catalogueItem.costValue,
			costDenomination: catalogueItem.costDenomination,
			weight: catalogueItem.weight,
			thumbnailUrl: catalogueItem.thumbnailUrl,
			properties: catalogueItem.properties,
			stats: catalogueItem.stats,
		});
	});

	it("maps catalogue readiness failures to the consumer boundary", async () => {
		const service = {
			getItemDetails: vi.fn().mockRejectedValue(new CatalogueItemsUnavailableError()),
		};
		const client = createCatalogueItemClient({ catalogueService: service });

		await expect(client.getItemDetails(catalogueItem.id)).rejects.toBeInstanceOf(
			CatalogueItemClientUnavailableError,
		);
	});
});
