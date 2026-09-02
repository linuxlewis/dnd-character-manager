import { describe, expect, it, vi } from "vitest";
import { CATALOGUE_SOURCE_MANIFEST } from "../config/manifest.js";
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
			auditGate: () => undefined,
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

	it("requires the stored audit to match the current source pin", async () => {
		const repository = fakeRepository();
		repository.countItems.mockResolvedValue(627);
		repository.findLatestAudit.mockResolvedValue(
			itemAudit({ sourceRevision: "0123456789abcdef0123456789abcdef01234567" }),
		);
		const service = createCatalogueItemService({ repository });

		await expect(service.getItemStatus()).resolves.toMatchObject({
			readiness: "unavailable",
			seeded: false,
			count: 627,
		});
		await expect(service.searchItems({ q: "rope", limit: 50 })).rejects.toBeInstanceOf(
			CatalogueItemsUnavailableError,
		);
	});

	it("requires the projection count to match the successful audit", async () => {
		const repository = fakeRepository();
		repository.countItems.mockResolvedValue(626);
		repository.findLatestAudit.mockResolvedValue(itemAudit());
		const service = createCatalogueItemService({ repository });

		await expect(service.getItemStatus()).resolves.toMatchObject({ readiness: "unavailable" });
		await expect(
			service.getItemDetails("00000000-0000-4000-8000-000000000001"),
		).rejects.toBeInstanceOf(CatalogueItemsUnavailableError);
	});

	it("rejects a complete-looking but below-baseline source audit before promotion", async () => {
		const repository = fakeRepository();
		const files = Object.fromEntries(
			Array.from({ length: 7 }, (_, index) => [
				`packs/_source/equipment24/adventuring-gear/item-${index}.yml`,
				yaml(`Item ${index}`, `item-${index}`, "trinket"),
			]),
		);
		const service = createCatalogueItemService({ repository, fetcher: fakeFetcher(files) });

		await expect(service.seedFoundrySrd2024Items()).rejects.toMatchObject({
			name: "CatalogueItemSeedError",
			audit: { processed: 7, accepted: 7, rejected: 0 },
		});
		expect(repository.upsertItems).not.toHaveBeenCalled();
	});

	it("reports stored seed provenance instead of the current manifest revision", async () => {
		const repository = fakeRepository();
		const storedAudit = itemAudit();
		repository.countItems.mockResolvedValue(627);
		repository.findLatestAudit.mockResolvedValue(storedAudit);
		const service = createCatalogueItemService({ repository, spellCount: async () => 0 });

		expect(await service.getItemStatus()).toMatchObject({
			readiness: "ready",
			count: 627,
			sourceRevision: storedAudit.sourceRevision,
			audit: storedAudit,
		});
	});

	it("keeps the old valid snapshot unavailable after a failed new-pin seed", async () => {
		const repository = fakeRepository();
		repository.countItems.mockResolvedValue(627);
		repository.findLatestAudit.mockResolvedValue(
			itemAudit({ sourceRevision: "0123456789abcdef0123456789abcdef01234567" }),
		);
		const service = createCatalogueItemService({
			repository,
			fetcher: fakeFetcher({ "packs/_source/equipment24/broken.yml": "name: broken" }),
		});

		await expect(service.seedFoundrySrd2024Items()).rejects.toMatchObject({
			name: "CatalogueItemSeedError",
		});
		expect(repository.upsertItems).not.toHaveBeenCalled();
		await expect(service.getItemStatus()).resolves.toMatchObject({ readiness: "unavailable" });
	});

	it("returns to ready after a complete current-pin promotion", async () => {
		const repository = fakeRepository();
		repository.upsertItems.mockImplementation(async (items, audit) => {
			repository.countItems.mockResolvedValue(items.length);
			repository.findLatestAudit.mockResolvedValue(audit);
			return items.length;
		});
		const service = createCatalogueItemService({
			repository,
			fetcher: fakeFetcher(baselineFiles()),
		});

		const result = await service.seedFoundrySrd2024Items();
		expect(result.audit).toMatchObject({ processed: 627, accepted: 627, rejected: 0 });
		expect(await service.getItemStatus()).toMatchObject({
			readiness: "ready",
			seeded: true,
			count: 627,
			sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
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

function itemAudit(overrides: { sourceRevision?: string; accepted?: number } = {}) {
	const accepted = overrides.accepted ?? 627;
	return {
		source: "foundry-dnd5e" as const,
		sourceRevision: overrides.sourceRevision ?? CATALOGUE_SOURCE_MANIFEST.sourceRevision,
		rulesVersion: "2024" as const,
		capability: "equipment" as const,
		pack: "equipment24" as const,
		processed: accepted,
		accepted,
		rejected: 0,
		categoryCounts: {
			weapons: 82,
			armor: 32,
			adventuringGear: 161,
			consumables: 57,
			potions: 30,
			scrolls: 11,
			magicItems: 351,
		},
	};
}

function baselineFiles() {
	const files: Record<string, string> = {};
	const add = (path: string, name: string, type: string, rarity = "") => {
		files[path] = yaml(name, name.toLowerCase().replaceAll(" ", "-"), type, rarity);
	};
	const groups = [
		["weapons", 82, "Weapon", "simpleMelee", ""],
		["armor", 32, "Armor", "shield", ""],
		["adventuring-gear", 161, "Gear", "trinket", "common"],
		["consumables", 16, "Consumable", "consumable", ""],
		["consumables/potions", 30, "Potion", "potion", "common"],
		["consumables/scrolls", 11, "Scroll", "scroll", "common"],
		["magic-items", 295, "Magic Item", "", "uncommon"],
	] as const;
	for (const [directory, count, label, type, rarity] of groups) {
		for (let index = 0; index < count; index += 1) {
			add(
				`packs/_source/equipment24/${directory}/${directory.split("/").at(-1)}-${index}.yml`,
				`${label} ${index}`,
				type,
				directory === "adventuring-gear" && index >= 15 ? "" : rarity,
			);
		}
	}
	return files;
}
