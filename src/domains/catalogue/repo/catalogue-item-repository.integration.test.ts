import { closeDb, getDb } from "@providers/database/index.js";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { CatalogueItemSeed } from "../types/index.js";
import {
	type CatalogueItemRepository,
	createCatalogueItemRepository,
} from "./catalogue-item-repository.js";
import { catalogueItemSeedAuditsTable, catalogueItemsTable } from "./catalogue-item-table.js";

const sourceKeys = [
	"catalogue-item-repository-isolation-rope",
	"catalogue-item-repository-isolation-rope-legacy",
];
const testRevisions = [
	"1111111111111111111111111111111111111111",
	"2222222222222222222222222222222222222222",
];

const pinnedRevision = "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6";
const pinnedSentinelKey = "phbwepLongsword0";
const testRollback = Symbol("catalogue item repository test rollback");

afterAll(async () => closeDb());

describe.sequential("createCatalogueItemRepository", () => {
	it("persists provenance, supports search/detail, and is idempotent", async () => {
		await runIsolated(async (repository) => {
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
	});

	it("removes stale rows when synchronizing a later snapshot", async () => {
		await runIsolated(async (repository) => {
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
	});

	it("handles an empty snapshot by removing the complete scoped projection", async () => {
		await runIsolated(async (repository) => {
			const item = seedItem({ sourceKey: sourceKeys[0], rulesVersion: "2014", name: "Rope" });

			await repository.upsertItems([item], auditFor("2014", 1));
			await repository.upsertItems([], auditFor("2014", 0));

			expect((await repository.searchItems({ q: "Rope", limit: 50 })).total).toBe(0);
		});
	});

	it("counts mixed per-record rules versions in one pack projection", async () => {
		await runIsolated(async (repository) => {
			const current = seedItem({
				sourceKey: sourceKeys[0],
				rulesVersion: "2024",
				name: "Current Rope",
			});
			const legacy = seedItem({
				sourceKey: sourceKeys[1],
				rulesVersion: "2014",
				name: "Legacy Rope",
			});

			await repository.upsertItems([current, legacy], auditFor("2024", 2));

			expect(
				await repository.countItems({
					source: "foundry-dnd5e",
					sourceRevision: testRevisions[0],
					capability: "equipment",
					pack: "equipment24",
				}),
			).toBe(2);
			expect(
				await repository.countItems({
					source: "foundry-dnd5e",
					sourceRevision: testRevisions[0],
					rulesVersion: "2014",
					capability: "equipment",
					pack: "equipment24",
				}),
			).toBe(1);
		});
	});

	it("replaces rows and reports the stored audit when the source pin changes", async () => {
		await runIsolated(async (repository) => {
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
			expect(await repository.findLatestAudit()).toMatchObject({
				sourceRevision: testRevisions[0],
				accepted: 1,
			});
			const oldId = (await repository.searchItems({ q: "Old Pin", limit: 50 })).items[0]?.id;
			await repository.upsertItems([newItem], auditFor("2014", 1, testRevisions[1]));

			expect(await repository.countItems()).toBe(1);
			const newResult = await repository.searchItems({ q: "New Pin", limit: 50 });
			expect(newResult.total).toBe(1);
			expect(newResult.items[0]?.id).toBe(oldId);
			expect(await repository.findLatestAudit()).toMatchObject({
				accepted: 1,
			});
		});
	});
});

async function runIsolated(journey: (repository: CatalogueItemRepository) => Promise<void>) {
	const sentinelBefore = await readPinnedSentinel();
	await getDb()
		.transaction(async (tx) => {
			await journey(createCatalogueItemRepository(tx));
			throw testRollback;
		})
		.catch((error: unknown) => {
			if (error !== testRollback) throw error;
		});

	expect(await readPinnedSentinel()).toEqual(sentinelBefore);
	const leakedItems = await getDb()
		.select({ sourceKey: catalogueItemsTable.sourceKey })
		.from(catalogueItemsTable)
		.where(inArray(catalogueItemsTable.sourceKey, sourceKeys));
	const leakedAudits = await getDb()
		.select({ sourceRevision: catalogueItemSeedAuditsTable.sourceRevision })
		.from(catalogueItemSeedAuditsTable)
		.where(
			and(
				eq(catalogueItemSeedAuditsTable.source, "foundry-dnd5e"),
				inArray(catalogueItemSeedAuditsTable.sourceRevision, testRevisions),
			),
		);
	expect(leakedItems).toEqual([]);
	expect(leakedAudits).toEqual([]);
}

async function readPinnedSentinel() {
	const [row] = await getDb()
		.select({
			id: catalogueItemsTable.id,
			sourcePath: catalogueItemsTable.sourcePath,
			sourceRevision: catalogueItemsTable.sourceRevision,
		})
		.from(catalogueItemsTable)
		.where(
			and(
				eq(catalogueItemsTable.source, "foundry-dnd5e"),
				eq(catalogueItemsTable.sourceKey, pinnedSentinelKey),
				eq(catalogueItemsTable.rulesVersion, "2024"),
				eq(catalogueItemsTable.sourceRevision, pinnedRevision),
			),
		)
		.limit(1);
	return row ?? null;
}

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
