import { describe, expect, it, vi } from "vitest";
import type { CatalogueItemRepository } from "../repo/index.js";
import {
	CatalogueItemsUnavailableError,
	createCatalogueItemService,
} from "./catalogue-item-service.js";

const yaml = (name: string, identifier: string, type: string, rarity = "") => `
name: ${name}
system:
  description: { value: '<p>${name} description.</p>' }
  source: { rules: '2024', license: CC-BY-4.0 }
  price: { value: 1, denomination: gp }
  weight: { value: 1, units: lb }
  rarity: ${rarity}
  attunement: ''
  properties: []
  type: { value: ${type}, baseItem: '' }
  identifier: ${identifier}
_id: source${identifier}
type: equipment
`;

describe("createCatalogueItemService", () => {
	it("fetches, parses, audits, and upserts the equipment pack", async () => {
		const repository = fakeRepository();
		const files = {
			"packs/_source/equipment24/weapons/club.yml": yaml("Club", "club", "simpleMelee"),
			"packs/_source/equipment24/armor/shield.yml": yaml("Shield", "shield", "shield"),
			"packs/_source/equipment24/adventuring-gear/rope.yml": yaml("Rope", "rope", "trinket"),
			"packs/_source/equipment24/consumables/potions/potion-of-healing.yml": yaml(
				"Potion",
				"potion",
				"potion",
				"common",
			),
			"packs/_source/equipment24/consumables/scrolls/spell-scroll.yml": yaml(
				"Scroll",
				"scroll",
				"scroll",
			),
			"packs/_source/equipment24/consumables/acid.yml": yaml("Acid", "acid", "consumable"),
			"packs/_source/equipment24/armor/magical/adamantine.yml": yaml(
				"Adamantine",
				"adamantine",
				"",
				"uncommon",
			),
		};
		const service = createCatalogueItemService({
			repository,
			spellCount: async () => 4,
			fetcher: fakeFetcher(files),
		});

		const result = await service.seedFoundrySrd2024Items();

		expect(result.audit).toMatchObject({ processed: 7, accepted: 7, rejected: 0 });
		expect(result.audit.categoryCounts).toMatchObject({
			weapons: 1,
			armor: 2,
			adventuringGear: 1,
			consumables: 3,
			potions: 1,
			scrolls: 1,
			magicItems: 2,
		});
		expect(repository.upsertItems).toHaveBeenCalledWith(expect.any(Array), result.audit);
	});

	it("fails the batch with rejected source evidence and never partially upserts", async () => {
		const repository = fakeRepository();
		const service = createCatalogueItemService({
			repository,
			fetcher: fakeFetcher({ "packs/_source/equipment24/broken.yml": "name: broken" }),
		});

		await expect(service.seedFoundrySrd2024Items()).rejects.toMatchObject({
			name: "CatalogueItemSeedError",
			audit: { processed: 1, accepted: 0, rejected: 1 },
		});
		expect(repository.upsertItems).not.toHaveBeenCalled();
	});

	it("reports item readiness explicitly instead of returning an empty search", async () => {
		const repository = fakeRepository();
		const service = createCatalogueItemService({ repository, spellCount: async () => 0 });

		await expect(service.searchItems({ q: "rope", limit: 50 })).rejects.toBeInstanceOf(
			CatalogueItemsUnavailableError,
		);
		await expect(
			service.getItemDetails("00000000-0000-4000-8000-000000000001"),
		).rejects.toBeInstanceOf(CatalogueItemsUnavailableError);
		await expect(service.getStatus()).resolves.toMatchObject({
			items: { readiness: "unavailable", seeded: false, count: 0 },
			capabilities: [
				{ capability: "spells", readiness: "unavailable" },
				{ capability: "items", readiness: "unavailable" },
			],
		});
	});
});

function fakeRepository() {
	return {
		upsertItems: vi.fn<CatalogueItemRepository["upsertItems"]>(async (items) => items.length),
		countItems: vi.fn<CatalogueItemRepository["countItems"]>(async () => 0),
		searchItems: vi.fn<CatalogueItemRepository["searchItems"]>(async () => ({
			items: [],
			total: 0,
		})),
		findItem: vi.fn<CatalogueItemRepository["findItem"]>(async () => null),
		findLatestAudit: vi.fn<CatalogueItemRepository["findLatestAudit"]>(async () => null),
	};
}

function fakeFetcher(files: Record<string, string>) {
	return async (url: string | URL | Request): Promise<Response> => {
		const value = String(url);
		if (value.includes("/git/trees/")) {
			return Response.json({
				tree: Object.keys(files).map((path) => ({ path, type: "blob" })),
			});
		}
		const path = Object.keys(files).find((candidate) => value.endsWith(candidate));
		return path ? new Response(files[path]) : new Response("not found", { status: 404 });
	};
}
