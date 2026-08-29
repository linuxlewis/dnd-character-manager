import { z } from "zod";
import { assertCatalogueItemSourceAudit } from "../config/catalogue-item-audit.js";
import {
	FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX,
	FOUNDRY_DND5E_RULES_VERSION,
	FOUNDRY_DND5E_SOURCE,
	foundryDnd5eRawUrl,
	foundryDnd5eTreeUrl,
} from "../config/index.js";
import { CATALOGUE_SOURCE_MANIFEST } from "../config/manifest.js";
import {
	type CatalogueItemRepository,
	createCatalogueItemRepository,
	createCatalogueSpellRepository,
	deduplicateCatalogueItems,
	parseFoundryItemSource,
} from "../repo/index.js";
import type {
	CatalogueItemDetailPort,
	CatalogueItemSearchPort,
	CatalogueItemSeed,
	CatalogueItemSeedAudit,
	CatalogueItemStatusPort,
	CatalogueStatusResponse,
} from "../types/index.js";
import {
	CatalogueItemIdSchema,
	CatalogueItemSearchQuerySchema,
	CatalogueItemSeedAuditSchema,
	CatalogueItemSeedStatusSchema,
	CatalogueStatusResponseSchema,
} from "../types/index.js";

const FoundryTreeResponseSchema = z.object({
	tree: z.array(z.object({ path: z.string(), type: z.string() })),
});
const FETCH_CONCURRENCY = 10;

export class CatalogueItemSeedError extends Error {
	audit?: CatalogueItemSeedAudit;

	constructor(message: string, audit?: CatalogueItemSeedAudit) {
		super(message);
		this.name = "CatalogueItemSeedError";
		this.audit = audit;
	}
}

export class CatalogueItemsUnavailableError extends Error {
	constructor() {
		super("Catalogue item data has not been seeded.");
		this.name = "CatalogueItemsUnavailableError";
	}
}

export interface CatalogueItemService
	extends CatalogueItemSearchPort,
		CatalogueItemDetailPort,
		CatalogueItemStatusPort {
	seedFoundrySrd2024Items(): Promise<{ processed: number; audit: CatalogueItemSeedAudit }>;
	getStatus(): Promise<CatalogueStatusResponse>;
}

export interface CatalogueItemServiceOptions {
	repository?: CatalogueItemRepository;
	spellCount?: () => Promise<number>;
	fetcher?: typeof fetch;
	auditGate?: (audit: CatalogueItemSeedAudit) => void;
}

export function createCatalogueItemService(
	options: CatalogueItemServiceOptions = {},
): CatalogueItemService {
	const repository = options.repository ?? createCatalogueItemRepository();
	const spellCount = options.spellCount ?? (() => createCatalogueSpellRepository().countSpells());
	const fetcher = options.fetcher ?? fetch;
	const auditGate = options.auditGate ?? assertCatalogueItemSourceAudit;

	const readItemStatus = async () => {
		const [itemCount, audit] = await Promise.all([
			repository.countItems(),
			repository.findLatestAudit(),
		]);
		return CatalogueItemSeedStatusSchema.parse({
			capability: "items",
			pack: "equipment24",
			readiness: itemCount > 0 ? "ready" : "unavailable",
			seeded: itemCount > 0,
			count: itemCount,
			sourceRevision: audit?.sourceRevision ?? null,
			audit,
		});
	};

	return {
		async seedFoundrySrd2024Items() {
			try {
				const paths = await fetchFoundryItemPaths(fetcher);
				const results: Awaited<ReturnType<typeof fetchAndParseItem>>[] = [];
				for (let index = 0; index < paths.length; index += FETCH_CONCURRENCY) {
					const batch = paths.slice(index, index + FETCH_CONCURRENCY);
					results.push(
						...(await Promise.all(batch.map((path) => fetchAndParseItem(fetcher, path)))),
					);
				}
				const accepted = deduplicateCatalogueItems(
					results.flatMap((result) => (result.item ? [result.item] : [])),
				);
				const audit = CatalogueItemSeedAuditSchema.parse({
					source: FOUNDRY_DND5E_SOURCE,
					sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
					rulesVersion: FOUNDRY_DND5E_RULES_VERSION,
					capability: "equipment",
					pack: "equipment24",
					processed: paths.length,
					accepted: accepted.length,
					rejected: results.filter((result) => result.error).length,
					categoryCounts: itemAuditCounts(accepted),
				});
				if (audit.rejected > 0) {
					throw new CatalogueItemSeedError(
						`D&D item catalogue seed rejected ${audit.rejected} source records. ${results.find((result) => result.error)?.error}`,
						audit,
					);
				}
				try {
					auditGate(audit);
				} catch (error) {
					throw new CatalogueItemSeedError(
						`D&D item catalogue seed failed audit gate: ${errorMessage(error)}`,
						audit,
					);
				}
				await repository.upsertItems(accepted, audit);
				return { processed: paths.length, audit };
			} catch (error) {
				if (error instanceof CatalogueItemSeedError) throw error;
				throw new CatalogueItemSeedError(`D&D item catalogue seed failed: ${errorMessage(error)}`);
			}
		},

		async searchItems(input) {
			const query = CatalogueItemSearchQuerySchema.parse(input);
			if ((await repository.countItems()) === 0) throw new CatalogueItemsUnavailableError();
			return repository.searchItems(query);
		},

		async getItemDetails(id) {
			if ((await repository.countItems()) === 0) throw new CatalogueItemsUnavailableError();
			return repository.findItem(CatalogueItemIdSchema.parse(id));
		},

		async getItemStatus() {
			return readItemStatus();
		},

		async getStatus() {
			const [itemStatus, spellsCount] = await Promise.all([readItemStatus(), spellCount()]);
			return CatalogueStatusResponseSchema.parse({
				source: {
					name: FOUNDRY_DND5E_SOURCE,
					sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
					rulesVersion: FOUNDRY_DND5E_RULES_VERSION,
					sourceUrl: CATALOGUE_SOURCE_MANIFEST.sourceUrl,
					attribution: CATALOGUE_SOURCE_MANIFEST.attribution,
				},
				capabilities: [
					{
						capability: "spells",
						pack: "spells24",
						readiness: spellsCount > 0 ? "ready" : "unavailable",
						seeded: spellsCount > 0,
						count: spellsCount,
						sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
					},
					itemStatus,
				],
				items: itemStatus,
			});
		},
	};
}

async function fetchFoundryItemPaths(fetcher: typeof fetch) {
	const response = await fetcher(foundryDnd5eTreeUrl());
	if (!response.ok)
		throw new CatalogueItemSeedError(`Foundry source tree failed (${response.status}).`);
	const parsed = FoundryTreeResponseSchema.parse(await response.json());
	if (
		!parsed.tree.some(
			(entry) =>
				entry.type === "blob" && entry.path.startsWith(FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX),
		)
	) {
		throw new CatalogueItemSeedError(
			"Foundry source revision is missing the equipment24 catalogue pack.",
		);
	}
	return parsed.tree
		.filter((entry) => entry.type === "blob" && isFoundryItemSourcePath(entry.path))
		.map((entry) => entry.path)
		.sort();
}

async function fetchAndParseItem(fetcher: typeof fetch, path: string) {
	try {
		const response = await fetcher(foundryDnd5eRawUrl(path));
		if (!response.ok) throw new Error(`source returned ${response.status}`);
		return { item: parseFoundryItemSource({ path, yaml: await response.text() }) };
	} catch (error) {
		return { error: `${path}: ${errorMessage(error)}` };
	}
}

function isFoundryItemSourcePath(path: string) {
	return (
		path.startsWith(FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX) &&
		path.endsWith(".yml") &&
		!path.endsWith("/_folder.yml")
	);
}

function itemAuditCounts(items: CatalogueItemSeed[]) {
	return {
		weapons: items.filter((item) => item.category === "Weapons").length,
		armor: items.filter((item) => item.category === "Armor").length,
		adventuringGear: items.filter((item) => item.category === "Adventuring Gear").length,
		consumables: items.filter((item) => ["potion", "scroll", "consumable"].includes(item.kind))
			.length,
		potions: items.filter((item) => item.kind === "potion").length,
		scrolls: items.filter((item) => item.kind === "scroll").length,
		magicItems: items.filter((item) => item.isMagical).length,
		tools: items.filter((item) => item.kind === "tool").length,
		containers: items.filter((item) => item.kind === "container").length,
		other: items.filter((item) => item.kind === "other").length,
	};
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}
