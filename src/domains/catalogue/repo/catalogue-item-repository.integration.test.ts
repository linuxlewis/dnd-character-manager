import { closeDb, getDb } from "@providers/database/index.js";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { CatalogueItemSeed } from "../types/index.js";
import { createCatalogueItemRepository } from "./catalogue-item-repository.js";
import { catalogueItemSeedAuditsTable, catalogueItemsTable } from "./catalogue-item-table.js";

const sourceKeys = ["catalogue-item-repository-rope", "catalogue-item-repository-rope-legacy"];
const testRevisions = [
	"0123456789abcdef0123456789abcdef01234567",
	"fedcba9876543210fedcba9876543210fedcba98",
];

beforeEach(async () => {
	await getDb()
		.delete(catalogueItemsTable)
		.where(inArray(catalogueItemsTable.sourceKey, sourceKeys));
	await getDb()
		.delete(catalogueItemSeedAuditsTable)
		.where(
			and(
				eq(catalogueItemSeedAuditsTable.source, "foundry-dnd5e"),
				inArray(catalogueItemSeedAuditsTable.sourceRevision, testRevisions),
			),
		);
});

afterAll(async () => closeDb());

describe("createCatalogueItemRepository", () => {
	it("persists provenance, supports search/detail, and is idempotent", async () => {
		const repository = createCatalogueItemRepository();
		const current = seedItem({ sourceKey: sourceKeys[0], rulesVersion: "2014", name: "Rope" });
		const legacy = seedItem({
			sourceKey: sourceKeys[1],
			rulesVersion: "2014",
			name: "Rope (Legacy)",
		});
		const audit = auditFor(current.rulesVersion, 2);

		await repository.upsertItems([current, legacy], audit);
		const initial = await repository.searchItems({ q: "Rope", limit: 50 });
		const initialIds = new Map(initial.items.map((item) => [item.sourceKey, item.id]));
		await repository.upsertItems(
			[{ ...current, description: "Updated C2 repository precedence rope marker." }, legacy],
			audit,
		);
		const results = await repository.searchItems({ q: "Rope", limit: 50 });
		const details = await repository.findItem(
			results.items[0]?.id ?? "00000000-0000-4000-8000-000000000001",
		);

		expect(results.total).toBe(2);
		expect(results.items).toHaveLength(2);
		expect(results.items.map((item) => [item.sourceKey, item.id])).toEqual(
			expect.arrayContaining([
				[sourceKeys[0], initialIds.get(sourceKeys[0])],
				[sourceKeys[1], initialIds.get(sourceKeys[1])],
			]),
		);
		expect(details).toMatchObject({
			description: "Updated C2 repository precedence rope marker.",
			sourcePath: current.sourcePath,
			sourceRevision: current.sourceRevision,
		});
		expect(await repository.countItems()).toBe(2);
		expect(await repository.findLatestAudit()).toEqual(audit);
	});

	it("removes stale rows when synchronizing a later snapshot", async () => {
		const repository = createCatalogueItemRepository();
		const first = seedItem({ sourceKey: sourceKeys[0], rulesVersion: "2014", name: "Rope" });
		const stale = seedItem({
			sourceKey: sourceKeys[1],
			rulesVersion: "2014",
			name: "Old Rope",
		});
		const firstAudit = auditFor("2014", 2);

		await repository.upsertItems([first, stale], firstAudit);
		await repository.upsertItems([first], auditFor("2014", 1));

		expect(await repository.countItems()).toBe(1);
		expect((await repository.searchItems({ q: "Old Rope", limit: 50 })).total).toBe(0);
	});

	it("handles an empty snapshot by removing the complete scoped projection", async () => {
		const repository = createCatalogueItemRepository();
		const item = seedItem({ sourceKey: sourceKeys[0], rulesVersion: "2014", name: "Rope" });

		await repository.upsertItems([item], auditFor("2014", 1));
		await repository.upsertItems([], auditFor("2014", 0));

		expect((await repository.searchItems({ q: "Rope", limit: 50 })).total).toBe(0);
	});

	it("replaces rows and reports the stored audit when the source pin changes", async () => {
		const repository = createCatalogueItemRepository();
		const oldItem = seedItem({
			sourceKey: sourceKeys[0],
			rulesVersion: "2014",
			sourceRevision: testRevisions[0],
			name: "Old Pin",
		});
		const newItem = seedItem({
			sourceKey: sourceKeys[0],
			rulesVersion: "2014",
			sourceRevision: testRevisions[1],
			name: "New Pin",
		});

		await repository.upsertItems([oldItem], auditFor("2014", 1, testRevisions[0]));
		const oldId = (await repository.searchItems({ q: "Old Pin", limit: 50 })).items[0]?.id;
		await repository.upsertItems([newItem], auditFor("2014", 1, testRevisions[1]));

		expect(await repository.countItems()).toBe(1);
		const newResult = await repository.searchItems({ q: "New Pin", limit: 50 });
		expect(newResult.total).toBe(1);
		expect(newResult.items[0]?.id).toBe(oldId);
		expect(await repository.findLatestAudit()).toMatchObject({
			sourceRevision: testRevisions[1],
			accepted: 1,
		});
	});
});

function auditFor(
	rulesVersion: "2014" | "2024",
	accepted: number,
	sourceRevision = testRevisions[0],
) {
	return {
		source: "foundry-dnd5e" as const,
		sourceRevision,
		rulesVersion,
		capability: "equipment" as const,
		pack: "equipment24" as const,
		processed: accepted,
		accepted,
		rejected: 0,
		categoryCounts: {
			weapons: 0,
			armor: 0,
			adventuringGear: accepted,
			consumables: 0,
			potions: 0,
			scrolls: 0,
			magicItems: 0,
		},
	};
}

function seedItem({
	sourceKey,
	rulesVersion,
	name,
	sourceRevision = testRevisions[0],
}: {
	sourceKey: string;
	rulesVersion: "2014" | "2024";
	name: string;
	sourceRevision?: string;
}): CatalogueItemSeed {
	return {
		source: "foundry-dnd5e",
		sourceKey,
		sourcePath: `packs/_source/equipment24/${sourceKey}.yml`,
		sourceRevision,
		sourceUrl: `https://raw.githubusercontent.com/foundryvtt/dnd5e/${sourceRevision}/packs/_source/equipment24/${sourceKey}.yml`,
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
