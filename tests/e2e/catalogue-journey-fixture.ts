import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import {
	FOUNDRY_DND5E_RULES_VERSION,
	FOUNDRY_DND5E_SOURCE,
	foundryDnd5eRawUrl,
} from "../../src/domains/catalogue/config/index.js";
import { CATALOGUE_SOURCE_MANIFEST } from "../../src/domains/catalogue/config/manifest.js";

const fixtureRunId = `${Date.now().toString(36)}-${process.pid}-${randomUUID().slice(0, 8)}`;
const fixtureSourcePrefix = `codex-a7-${fixtureRunId}`;
const fixtureAuditMarker = `a7_${fixtureRunId.replaceAll("-", "_")}`;
const fixtureLockNamespace = 20260829;
const fixtureLockId = 7;
const seededMundaneSourceKey = "phbwepLongsword0";
const seededMagicSourceKey = "dmgDancingSword0";
const syntheticMundaneName = `Silvered Blade ${fixtureRunId}`;
const syntheticMagicName = `Moonblade ${fixtureRunId}`;
let syntheticFixtureCreated = false;
let fixtureAuditOwnership: CatalogueAuditOwnership | null = null;
let fixtureLockConnection: postgres.ReservedSql | null = null;

type CatalogueAuditRow = {
	id: string;
	source: string;
	source_revision: string;
	rules_version: string;
	capability: string;
	pack: string;
	processed: number | string;
	accepted: number | string;
	rejected: number | string;
	category_counts: Record<string, number>;
	created_at: string;
	row_version: string;
};

type CatalogueAuditOwnership = {
	previous: CatalogueAuditRow | null;
	owned: CatalogueAuditRow;
};

export type CatalogueJourneyFixture = {
	mode: "seeded" | "synthetic";
	searchQuery: string;
	inventorySearchQuery: string;
	mundaneName: string;
	magicName: string;
	rulesVersion: "2024";
};

type SeededCatalogueItemRow = {
	source_key: string;
	item_name: string;
	item_kind: string;
	item_category: string;
	is_magical: boolean;
	rules_version: string;
};

export async function prepareCatalogueJourneyFixture(
	database: ReturnType<typeof postgres>,
): Promise<CatalogueJourneyFixture> {
	const initialSeededFixture = await findSeededCatalogueFixture(database);
	if (initialSeededFixture) {
		await waitForCanonicalSeededProjection(database);
		return initialSeededFixture;
	}

	const lockedDatabase = await acquireCatalogueFixtureLock(database);
	const seededFixture = await findSeededCatalogueFixture(lockedDatabase);
	if (seededFixture) {
		await waitForCanonicalSeededProjection(lockedDatabase);
		await releaseCatalogueFixtureLock();
		return seededFixture;
	}

	const audit = await readCatalogueAudit(lockedDatabase);
	const currentItemCount = await countCatalogueItems(lockedDatabase);
	if (isUsableCurrentProjection(audit, currentItemCount)) {
		const syntheticItemCount = await countSyntheticCatalogueItems(lockedDatabase);
		if (syntheticItemCount > 0 || hasSyntheticAuditMarker(audit)) {
			throw new Error(
				"Synthetic A7 catalogue projection remained after acquiring exclusive fixture ownership.",
			);
		}
		throw new Error("Ready catalogue is missing the pinned A7 Longsword/Dancing Sword records.");
	}

	const fixture = syntheticCatalogueFixture();
	syntheticFixtureCreated = true;
	await insertFixtureRows(lockedDatabase, buildCatalogueFixture(fixture));

	const projectionRows = await lockedDatabase<
		{ item_category: string; item_kind: string; is_magical: boolean }[]
	>`
		SELECT item_category, item_kind, is_magical
		FROM catalogue_items
		WHERE source = ${FOUNDRY_DND5E_SOURCE}
		  AND source_revision = ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}
		  AND seed_capability = 'equipment'
		  AND seed_pack = 'equipment24'
	`;
	const ownership = await claimCatalogueAudit(
		lockedDatabase,
		audit,
		getCategoryCounts(projectionRows),
		projectionRows.length,
	);
	if (ownership) {
		fixtureAuditOwnership = ownership;
		return fixture;
	}

	const concurrentAudit = await readCatalogueAudit(lockedDatabase);
	const concurrentItemCount = await countCatalogueItems(lockedDatabase);
	if (isUsableCurrentProjection(concurrentAudit, concurrentItemCount)) return fixture;
	if (
		isUsableCurrentProjection(
			concurrentAudit,
			await countCatalogueItems(lockedDatabase, { excludeFixture: true }),
		)
	) {
		await deleteFixtureRows(lockedDatabase);
		syntheticFixtureCreated = false;
		const concurrentSeededFixture = await requireSeededCatalogueFixture(lockedDatabase);
		await releaseCatalogueFixtureLock();
		return concurrentSeededFixture;
	}

	await deleteFixtureRows(lockedDatabase);
	syntheticFixtureCreated = false;
	throw new Error(
		"Catalogue readiness changed during A7 fixture setup; refusing to overwrite the concurrent audit.",
	);
}

async function acquireCatalogueFixtureLock(database: ReturnType<typeof postgres>) {
	const connection = await database.reserve();
	try {
		await connection`SELECT pg_advisory_lock(${fixtureLockNamespace}, ${fixtureLockId})`;
		fixtureLockConnection = connection;
		return connection;
	} catch (error) {
		connection.release();
		throw error;
	}
}

async function releaseCatalogueFixtureLock() {
	const connection = fixtureLockConnection;
	if (!connection) return;
	fixtureLockConnection = null;
	try {
		const [result] = await connection<{ unlocked: boolean }[]>`
			SELECT pg_advisory_unlock(${fixtureLockNamespace}, ${fixtureLockId}) AS unlocked
		`;
		if (!result?.unlocked) throw new Error("A7 catalogue fixture advisory lock was not held.");
	} finally {
		connection.release();
	}
}

async function findSeededCatalogueFixture(
	database: ReturnType<typeof postgres>,
): Promise<CatalogueJourneyFixture | null> {
	const rows = await database<SeededCatalogueItemRow[]>`
		SELECT source_key, item_name, item_kind, item_category, is_magical, rules_version
		FROM catalogue_items
		WHERE source = ${FOUNDRY_DND5E_SOURCE}
		  AND source_revision = ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}
		  AND source_key IN (${seededMundaneSourceKey}, ${seededMagicSourceKey})
	`;
	const items = new Map(rows.map((row) => [row.source_key, row]));
	const mundane = items.get(seededMundaneSourceKey);
	const magic = items.get(seededMagicSourceKey);
	if (!mundane || !magic) return null;
	if (
		mundane.item_name !== "Longsword" ||
		mundane.item_kind !== "weapon" ||
		mundane.item_category !== "Weapons" ||
		mundane.is_magical ||
		mundane.rules_version !== FOUNDRY_DND5E_RULES_VERSION ||
		magic.item_name !== "Dancing Sword" ||
		magic.item_kind !== "magic-item" ||
		magic.item_category !== "Weapons" ||
		!magic.is_magical ||
		magic.rules_version !== FOUNDRY_DND5E_RULES_VERSION
	) {
		throw new Error("Ready catalogue is missing the pinned A7 Longsword/Dancing Sword records.");
	}

	return {
		mode: "seeded",
		searchQuery: "sword",
		inventorySearchQuery: mundane.item_name,
		mundaneName: mundane.item_name,
		magicName: magic.item_name,
		rulesVersion: FOUNDRY_DND5E_RULES_VERSION,
	};
}

async function requireSeededCatalogueFixture(database: ReturnType<typeof postgres>) {
	const fixture = await findSeededCatalogueFixture(database);
	if (!fixture) {
		throw new Error("Ready catalogue is missing the pinned A7 Longsword/Dancing Sword records.");
	}
	return fixture;
}

async function waitForCanonicalSeededProjection(database: ReturnType<typeof postgres>) {
	const deadline = Date.now() + 15_000;
	do {
		const audit = await readCatalogueAudit(database);
		const itemCount = await countCatalogueItems(database);
		if (isCanonicalSeededProjection(audit, itemCount)) return;
		await new Promise((resolve) => setTimeout(resolve, 250));
	} while (Date.now() < deadline);

	throw new Error("Pinned A7 catalogue did not return to its canonical 627-row ready state.");
}

function syntheticCatalogueFixture(): CatalogueJourneyFixture {
	return {
		mode: "synthetic",
		searchQuery: "blade",
		inventorySearchQuery: "Silvered",
		mundaneName: syntheticMundaneName,
		magicName: syntheticMagicName,
		rulesVersion: FOUNDRY_DND5E_RULES_VERSION,
	};
}

async function insertFixtureRows(
	database: ReturnType<typeof postgres>,
	items: ReturnType<typeof buildCatalogueFixture>,
) {
	for (const item of items) {
		await database`
			INSERT INTO catalogue_items (
				id, source, source_key, source_path, source_revision, source_url, rules_version, license,
				seed_capability, seed_pack, seed_metadata, item_identifier, item_name, item_kind,
				item_category, item_description, is_magical, item_rarity, requires_attunement,
				cost_value, cost_denomination, weight, thumbnail_url, properties, stats, source_payload
			)
			VALUES (
				${item.id}, ${item.source}, ${item.sourceKey}, ${item.sourcePath}, ${item.sourceRevision},
				${item.sourceUrl}, ${item.rulesVersion}, ${item.license}, ${item.seedCapability}, ${item.seedPack},
				${database.json(item.seedMetadata)}, ${item.identifier}, ${item.name}, ${item.kind}, ${item.category},
				${item.description}, ${item.isMagical}, ${item.rarity}, ${item.requiresAttunement}, ${item.costValue},
				${item.costDenomination}, ${item.weight}, ${item.thumbnailUrl}, ${database.json(item.properties)},
				${database.json(item.stats)}, ${database.json(item.sourcePayload)}
			)
			`;
	}
}

async function deleteFixtureRows(database: ReturnType<typeof postgres>) {
	await database`DELETE FROM catalogue_items WHERE seed_metadata->>'fixture' = ${fixtureSourcePrefix}`;
}

async function readCatalogueAudit(database: ReturnType<typeof postgres>) {
	const [audit] = await database<CatalogueAuditRow[]>`
		SELECT id, source, source_revision, rules_version, capability, pack, processed, accepted,
			rejected, category_counts, created_at::text AS created_at, xmin::text AS row_version
		FROM catalogue_item_seed_audits
		WHERE source = ${FOUNDRY_DND5E_SOURCE}
		  AND source_revision = ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}
		  AND pack = 'equipment24'
		LIMIT 1
	`;
	return audit;
}

async function countCatalogueItems(
	database: ReturnType<typeof postgres>,
	options: { excludeFixture?: boolean } = {},
) {
	const [countRow] = await database<{ count: number | string }[]>`
		SELECT count(*)::int AS count
		FROM catalogue_items
		WHERE source = ${FOUNDRY_DND5E_SOURCE}
		  AND source_revision = ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}
		  AND seed_capability = 'equipment'
		  AND seed_pack = 'equipment24'
		  ${
				options.excludeFixture
					? database`AND seed_metadata->>'fixture' IS DISTINCT FROM ${fixtureSourcePrefix}`
					: database``
			}
	`;
	return Number(countRow?.count ?? 0);
}

async function countSyntheticCatalogueItems(database: ReturnType<typeof postgres>) {
	const [countRow] = await database<{ count: number | string }[]>`
		SELECT count(*)::int AS count
		FROM catalogue_items
		WHERE source = ${FOUNDRY_DND5E_SOURCE}
		  AND source_revision = ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}
		  AND seed_capability = 'equipment'
		  AND seed_pack = 'equipment24'
		  AND seed_metadata->>'fixture' LIKE 'codex-a7-%'
	`;
	return Number(countRow?.count ?? 0);
}

async function claimCatalogueAudit(
	database: ReturnType<typeof postgres>,
	previous: CatalogueAuditRow | undefined,
	categoryCounts: Record<string, number>,
	processed: number,
) {
	const ownedCategoryCounts = { ...categoryCounts, [fixtureAuditMarker]: 1 };
	if (previous) {
		const [owned] = await database<CatalogueAuditRow[]>`
			UPDATE catalogue_item_seed_audits
			SET rules_version = ${FOUNDRY_DND5E_RULES_VERSION}, capability = 'equipment',
				processed = ${processed}, accepted = ${processed}, rejected = 0,
				category_counts = ${database.json(ownedCategoryCounts)}, created_at = now()
			WHERE id = ${previous.id}
			  AND source = ${previous.source}
			  AND source_revision = ${previous.source_revision}
			  AND rules_version = ${previous.rules_version}
			  AND capability = ${previous.capability}
			  AND pack = ${previous.pack}
			  AND processed = ${Number(previous.processed)}
			  AND accepted = ${Number(previous.accepted)}
			  AND rejected = ${Number(previous.rejected)}
			  AND category_counts = ${database.json(previous.category_counts)}
			  AND created_at::text = ${previous.created_at}
			  AND xmin::text = ${previous.row_version}
			RETURNING id, source, source_revision, rules_version, capability, pack, processed,
				accepted, rejected, category_counts, created_at::text AS created_at, xmin::text AS row_version
		`;
		return owned ? { previous, owned } : null;
	}

	const [owned] = await database<CatalogueAuditRow[]>`
		INSERT INTO catalogue_item_seed_audits (
			source, source_revision, rules_version, capability, pack, processed, accepted, rejected, category_counts
		)
		VALUES (
			${FOUNDRY_DND5E_SOURCE}, ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}, ${FOUNDRY_DND5E_RULES_VERSION},
			'equipment', 'equipment24', ${processed}, ${processed}, 0, ${database.json(ownedCategoryCounts)}
		)
		ON CONFLICT (source, source_revision, pack) DO NOTHING
		RETURNING id, source, source_revision, rules_version, capability, pack, processed,
			accepted, rejected, category_counts, created_at::text AS created_at, xmin::text AS row_version
	`;
	return owned ? { previous: null, owned } : null;
}

function buildCatalogueFixture(fixture: CatalogueJourneyFixture) {
	const definitions = [
		["weapon", "Weapons", 82],
		["armor", "Armor", 32],
		["adventuring-gear", "Adventuring Gear", 161],
		["consumable", "Consumables", 57],
		["potion", "Potions", 30],
		["scroll", "Scrolls", 11],
		["magic-item", "Magic Items", 351],
	] as const;
	const items = definitions.flatMap(([kind, category, count]) =>
		Array.from({ length: count }, (_, index) => {
			const isSilveredBlade = kind === "weapon" && index === 0;
			const isMoonblade = kind === "magic-item" && index === 0;
			const name = isSilveredBlade
				? fixture.mundaneName
				: isMoonblade
					? fixture.magicName
					: `${category} Fixture ${index + 1}`;
			const sourceKey = isSilveredBlade
				? `${fixtureSourcePrefix}-silvered-blade`
				: isMoonblade
					? `${fixtureSourcePrefix}-moonblade`
					: `${fixtureSourcePrefix}-${kind}-${index + 1}`;
			const sourcePath = `packs/_source/equipment24/${kind}/${sourceKey}.yml`;
			return {
				id: randomUUID(),
				source: FOUNDRY_DND5E_SOURCE,
				sourceKey,
				sourcePath,
				sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
				sourceUrl: foundryDnd5eRawUrl(sourcePath),
				rulesVersion: fixture.rulesVersion,
				license: "CC-BY-4.0",
				seedCapability: "equipment",
				seedPack: "equipment24",
				seedMetadata: { fixture: fixtureSourcePrefix },
				identifier: sourceKey,
				name,
				kind,
				category,
				description: isSilveredBlade
					? "A practical blade treated with silver."
					: isMoonblade
						? "A luminous magical blade."
						: `Deterministic ${category.toLowerCase()} fixture.`,
				isMagical: kind === "magic-item",
				rarity: kind === "magic-item" ? "rare" : null,
				requiresAttunement: kind === "magic-item",
				costValue: isSilveredBlade ? 15 : null,
				costDenomination: isSilveredBlade ? "gp" : null,
				weight: isSilveredBlade || isMoonblade ? 3 : null,
				thumbnailUrl: null,
				properties: isSilveredBlade ? ["versatile"] : [],
				stats: isSilveredBlade ? { damage: "1d8 slashing" } : {},
				sourcePayload: { fixture: fixtureSourcePrefix },
			};
		}),
	);
	return items;
}

function isUsableCurrentProjection(audit: CatalogueAuditRow | undefined, itemCount: number) {
	if (!isCompleteCatalogueAudit(audit)) return false;
	if (Number(audit.accepted) !== itemCount) return false;
	return true;
}

function isCanonicalSeededProjection(audit: CatalogueAuditRow | undefined, itemCount: number) {
	return (
		isUsableCurrentProjection(audit, itemCount) &&
		Number(audit?.processed) === 627 &&
		Number(audit?.accepted) === 627 &&
		itemCount === 627
	);
}

function hasSyntheticAuditMarker(audit: CatalogueAuditRow | undefined) {
	return Boolean(audit && Object.keys(audit.category_counts).some((key) => key.startsWith("a7_")));
}

function isCompleteCatalogueAudit(
	audit: CatalogueAuditRow | undefined,
): audit is CatalogueAuditRow {
	if (!audit) return false;
	if (audit.rules_version !== FOUNDRY_DND5E_RULES_VERSION) return false;
	if (audit.capability !== "equipment" || audit.pack !== "equipment24") return false;
	if (Number(audit.rejected) !== 0) return false;
	if (Number(audit.processed) < 627) return false;
	return Object.entries({
		weapons: 82,
		armor: 32,
		adventuringGear: 161,
		consumables: 57,
		potions: 30,
		scrolls: 11,
		magicItems: 351,
	}).every(([key, minimum]) => Number(audit.category_counts[key] ?? 0) >= minimum);
}

function getCategoryCounts(
	rows: Array<{ item_category: string; item_kind: string; is_magical: boolean }>,
) {
	return {
		weapons: rows.filter((row) => row.item_category === "Weapons").length,
		armor: rows.filter((row) => row.item_category === "Armor").length,
		adventuringGear: rows.filter((row) => row.item_category === "Adventuring Gear").length,
		consumables: rows.filter((row) => ["potion", "scroll", "consumable"].includes(row.item_kind))
			.length,
		potions: rows.filter((row) => row.item_kind === "potion").length,
		scrolls: rows.filter((row) => row.item_kind === "scroll").length,
		magicItems: rows.filter((row) => row.is_magical).length,
	};
}

async function releaseCatalogueAudit(
	database: ReturnType<typeof postgres>,
	ownership: CatalogueAuditOwnership,
) {
	const { owned } = ownership;
	if (ownership.previous) {
		const previous = ownership.previous;
		await database`
			UPDATE catalogue_item_seed_audits
			SET source = ${previous.source}, source_revision = ${previous.source_revision},
				rules_version = ${previous.rules_version}, capability = ${previous.capability}, pack = ${previous.pack},
				processed = ${Number(previous.processed)}, accepted = ${Number(previous.accepted)},
				rejected = ${Number(previous.rejected)}, category_counts = ${database.json(previous.category_counts)},
				created_at = ${previous.created_at}
			WHERE id = ${owned.id}
			  AND source = ${owned.source}
			  AND source_revision = ${owned.source_revision}
			  AND rules_version = ${owned.rules_version}
			  AND capability = ${owned.capability}
			  AND pack = ${owned.pack}
			  AND processed = ${Number(owned.processed)}
			  AND accepted = ${Number(owned.accepted)}
			  AND rejected = ${Number(owned.rejected)}
			  AND category_counts = ${database.json(owned.category_counts)}
			  AND created_at::text = ${owned.created_at}
			  AND xmin::text = ${owned.row_version}
		`;
		return;
	}

	await database`
		DELETE FROM catalogue_item_seed_audits
		WHERE id = ${owned.id}
		  AND source = ${owned.source}
		  AND source_revision = ${owned.source_revision}
		  AND rules_version = ${owned.rules_version}
		  AND capability = ${owned.capability}
		  AND pack = ${owned.pack}
		  AND processed = ${Number(owned.processed)}
		  AND accepted = ${Number(owned.accepted)}
		  AND rejected = ${Number(owned.rejected)}
		  AND category_counts = ${database.json(owned.category_counts)}
		  AND created_at::text = ${owned.created_at}
		  AND xmin::text = ${owned.row_version}
	`;
}

export async function cleanupCatalogueJourneyFixture(database: ReturnType<typeof postgres>) {
	try {
		const ownedDatabase = fixtureLockConnection ?? database;
		if (syntheticFixtureCreated) await deleteFixtureRows(ownedDatabase);
		if (fixtureAuditOwnership) {
			await releaseCatalogueAudit(ownedDatabase, fixtureAuditOwnership);
		}
	} finally {
		try {
			await releaseCatalogueFixtureLock();
		} finally {
			syntheticFixtureCreated = false;
			fixtureAuditOwnership = null;
		}
	}
}
