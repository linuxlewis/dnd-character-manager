import { closeDb, getDb } from "@providers/database/index.js";
import { eq, inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import type { CatalogueItemSeed } from "../types/index.js";
import { createCatalogueItemRepository } from "./catalogue-item-repository.js";
import { catalogueItemSeedAuditsTable, catalogueItemsTable } from "./catalogue-item-table.js";

const sourceKeys = ["catalogue-item-repository-rope", "catalogue-item-repository-rope-legacy"];

afterEach(async () => {
	await getDb()
		.delete(catalogueItemsTable)
		.where(inArray(catalogueItemsTable.sourceKey, sourceKeys));
	await getDb()
		.delete(catalogueItemSeedAuditsTable)
		.where(eq(catalogueItemSeedAuditsTable.pack, "equipment24"));
	await closeDb();
});

describe("createCatalogueItemRepository", () => {
	it("persists provenance, supports search/detail, is idempotent, and keeps rules versions separate", async () => {
		const repository = createCatalogueItemRepository();
		const current = seedItem({ sourceKey: sourceKeys[0], rulesVersion: "2024", name: "Rope" });
		const legacy = seedItem({
			sourceKey: sourceKeys[1],
			rulesVersion: "2014",
			name: "Rope (Legacy)",
		});
		const audit = {
			processed: 2,
			accepted: 2,
			rejected: 0,
			categoryCounts: {
				weapons: 0,
				armor: 0,
				adventuringGear: 2,
				consumables: 0,
				potions: 0,
				scrolls: 0,
				magicItems: 0,
			},
		};

		await repository.upsertItems([current, legacy], audit);
		await repository.upsertItems(
			[{ ...current, description: "Updated C2 repository precedence rope marker." }, legacy],
			audit,
		);
		const results = await repository.searchItems({ q: "C2 repository precedence", limit: 50 });
		const details = await repository.findItem(
			results.items[0]?.id ?? "00000000-0000-4000-8000-000000000001",
		);

		expect(results.total).toBe(2);
		expect(results.items).toHaveLength(2);
		expect(details).toMatchObject({
			description: "Updated C2 repository precedence rope marker.",
			sourcePath: current.sourcePath,
			sourceRevision: current.sourceRevision,
		});
		expect(await repository.countItems()).toBe(2);
		expect(await repository.findLatestAudit()).toEqual(audit);
	});
});

function seedItem({
	sourceKey,
	rulesVersion,
	name,
}: {
	sourceKey: string;
	rulesVersion: "2014" | "2024";
	name: string;
}): CatalogueItemSeed {
	return {
		source: "foundry-dnd5e",
		sourceKey,
		sourcePath: `packs/_source/equipment24/${sourceKey}.yml`,
		sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
		sourceUrl: `https://raw.githubusercontent.com/foundryvtt/dnd5e/f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6/packs/_source/equipment24/${sourceKey}.yml`,
		rulesVersion,
		license: "CC-BY-4.0",
		capability: "equipment",
		pack: "equipment24",
		seedMetadata: { pack: "equipment24" },
		identifier: sourceKey,
		name,
		kind: "adventuring-gear",
		category: "Adventuring Gear",
		description: "C2 repository precedence rope marker.",
		isMagical: false,
		rarity: null,
		requiresAttunement: false,
		costValue: 1,
		costDenomination: "gp",
		weight: 5,
		thumbnailUrl: null,
		properties: [],
		stats: {},
		sourcePayload: { system: { identifier: sourceKey } },
	};
}
