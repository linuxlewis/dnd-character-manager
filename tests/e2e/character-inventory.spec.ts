import { randomUUID } from "node:crypto";
import { expect, type Locator, type Page, test } from "@playwright/test";
import postgres from "postgres";
import {
	FOUNDRY_DND5E_RULES_VERSION,
	FOUNDRY_DND5E_SOURCE,
	foundryDnd5eRawUrl,
} from "../../src/domains/catalogue/config/index.js";
import { CATALOGUE_SOURCE_MANIFEST } from "../../src/domains/catalogue/config/manifest.js";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
const fixtureRunId = `${Date.now().toString(36)}-${process.pid}-${randomUUID().slice(0, 8)}`;
const fixtureSourcePrefix = `codex-a7-${fixtureRunId}`;
const fixtureAuditMarker = `a7_${fixtureRunId.replaceAll("-", "_")}`;
const fixtureMundaneName = `Silvered Blade ${fixtureRunId}`;
const fixtureMagicName = `Moonblade ${fixtureRunId}`;
let fixtureRulesVersion: "2014" | "2024" = "2024";
let fixtureAuditOwnership: CatalogueAuditOwnership | null = null;

test.beforeAll(async () => {
	if (!sql) throw new Error("DATABASE_URL is required for character inventory e2e tests.");
	await seedCatalogue(sql);
});

test.afterAll(async () => {
	if (sql) {
		await sql`DELETE FROM catalogue_items WHERE seed_metadata->>'fixture' = ${fixtureSourcePrefix}`;
		if (fixtureAuditOwnership) await releaseCatalogueAudit(sql, fixtureAuditOwnership);
	}
	await sql?.end();
});

test("completes the M2 personal inventory journey", async ({ page }) => {
	await page.goto("/");
	const firstCharacterName = `A7 Inventory Hero ${Date.now()}`;
	await createCharacter(page, firstCharacterName, "Fighter");
	const firstCharacterUrl = page.url();
	const inventory = page.getByTestId("personal-inventory");

	await expect(page.getByText("No personal items yet")).toBeVisible();
	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const addDialog = page.getByRole("dialog", { name: "Add personal item" });
	await expect(addDialog.getByText("Rules 2024")).toBeVisible();
	await addDialog.getByLabel("Search SRD catalogue").fill("blade");
	await expect(
		addDialog.getByRole("button", { name: `Select catalogue item ${fixtureMundaneName}` }),
	).toBeVisible();
	await expect(
		addDialog.getByRole("button", { name: `Select catalogue item ${fixtureMagicName}` }),
	).toBeVisible();
	await expect(addDialog.getByText("Mundane", { exact: true })).toBeVisible();
	await expect(addDialog.getByText("Magic item", { exact: true })).toBeVisible();
	await addDialog
		.getByRole("button", { name: `Select catalogue item ${fixtureMundaneName}` })
		.click();
	await expect(addDialog.getByLabel("Name")).toHaveValue(fixtureMundaneName);
	await expect(addDialog.getByLabel("Category")).toHaveValue("Weapons");
	await addDialog.getByLabel("Quantity").fill("2");
	await addDialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(page.getByRole("button", { name: `View ${fixtureMundaneName}` })).toBeVisible();
	await expect(addDialog).toBeHidden();

	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const customDialog = page.getByRole("dialog", { name: "Add personal item" });
	await customDialog.getByLabel("Name").fill("Sage's Elixir");
	await selectOption(page, customDialog, "Type", "Potion");
	await selectOption(page, customDialog, "Rarity", "Rare");
	await customDialog.getByLabel("Category").fill("Potions");
	await customDialog.getByLabel("Quantity").fill("3");
	await customDialog.getByLabel("Weight (lb)").fill("0.5");
	await customDialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(page.getByRole("button", { name: "View Sage's Elixir" })).toBeVisible();

	await expect(page.getByText("2 items")).toBeVisible();
	await expect(page.getByRole("button", { name: /Equipment/ })).toContainText("1");
	await expect(page.getByRole("button", { name: /Potion/ })).toContainText("1");
	await expect(page.getByRole("button", { name: /All/ })).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByRole("button", { name: /Equipment/ })).toHaveAttribute(
		"aria-pressed",
		"false",
	);
	await expect(page.getByRole("tab")).toHaveCount(0);
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: "Sage's Elixir" })
			.getByText("Rare", { exact: true }),
	).toBeVisible();
	await expect(page.getByText("x2")).toBeVisible();
	await expect(page.getByText("x3")).toBeVisible();
	await expect(page.getByLabel("Equipment icon")).toBeVisible();
	await expect(page.getByLabel("Potion icon")).toBeVisible();

	const inventorySearch = page.getByLabel("Search personal inventory");
	await inventorySearch.fill("Silvered");
	await expect(page.getByRole("button", { name: `View ${fixtureMundaneName}` })).toBeVisible();
	await expect(page.getByRole("button", { name: "View Sage's Elixir" })).toBeHidden();
	await inventorySearch.fill("");
	await page.getByRole("button", { name: /Potion/ }).click();
	await expect(page.getByRole("button", { name: /Potion/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(page.getByRole("button", { name: "View Sage's Elixir" })).toBeVisible();
	await expect(page.getByRole("button", { name: `View ${fixtureMundaneName}` })).toBeHidden();
	await page.getByRole("button", { name: /All/ }).click();

	await page.getByRole("button", { name: `View ${fixtureMundaneName}` }).click();
	await expect(page.getByText(`Rules ${fixtureRulesVersion}`)).toBeVisible();
	await page.getByRole("button", { name: "Equip", exact: true }).click();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: fixtureMundaneName })
			.getByText("Equipped", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: `Close ${fixtureMundaneName} details` }).click();
	await page.reload();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: fixtureMundaneName })
			.getByText("Equipped"),
	).toBeVisible();

	await page.getByRole("button", { name: `View ${fixtureMundaneName}` }).click();
	await page
		.getByLabel(`${fixtureMundaneName}Equipment`, { exact: true })
		.getByRole("button", { name: "Edit", exact: true })
		.click();
	const editDialog = page.getByRole("dialog", { name: "Edit personal item" });
	await editDialog.getByLabel("Notes").fill("Found in the old keep");
	await editDialog.getByRole("button", { name: "Save item" }).click();
	await expect(editDialog).toBeHidden();
	await expect(page.getByText("Found in the old keep", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: `Close ${fixtureMundaneName} details` }).click();

	await page.route(
		"**/api/catalogue/status",
		async (route) =>
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Catalogue unavailable" }),
			}),
	);
	await page.route(
		"**/api/catalogue/items**",
		async (route) =>
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Catalogue unavailable" }),
			}),
	);
	await page.reload();
	await expect(page.getByRole("button", { name: `View ${fixtureMundaneName}` })).toBeVisible();
	await page.getByRole("button", { name: `View ${fixtureMundaneName}` }).click();
	await expect(page.getByText(`Rules ${fixtureRulesVersion}`)).toBeVisible();
	await page.getByRole("button", { name: `Close ${fixtureMundaneName} details` }).click();
	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const unavailableDialog = page.getByRole("dialog", { name: "Add personal item" });
	await expect(unavailableDialog.getByText("SRD catalogue unavailable")).toBeVisible();
	await expect(unavailableDialog.getByLabel("Name")).toBeVisible();
	await unavailableDialog.getByRole("button", { name: /Close add item dialog/ }).click();
	await expect(unavailableDialog).toBeHidden();
	await page.unroute("**/api/catalogue/status");
	await page.unroute("**/api/catalogue/items**");

	await page.getByRole("button", { name: `View ${fixtureMundaneName}` }).click();
	await page.getByRole("button", { name: "Unequip", exact: true }).click();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: fixtureMundaneName })
			.getByText("Equipped", { exact: true }),
	).toBeHidden();
	await page.getByRole("button", { name: "Delete", exact: true }).click();
	const deleteDialog = page.getByRole("dialog", { name: "Delete item?" });
	await expect(deleteDialog).toContainText(fixtureMundaneName);
	await deleteDialog.getByRole("button", { name: "Cancel" }).click();
	await page.getByRole("button", { name: "Delete", exact: true }).click();
	await page
		.getByRole("dialog", { name: "Delete item?" })
		.getByRole("button", { name: "Delete item" })
		.click();
	await expect(page.getByRole("button", { name: `View ${fixtureMundaneName}` })).toBeHidden();

	await page.getByText("Back to characters").click();
	const secondCharacterName = `A7 Inventory Second ${Date.now()}`;
	await createCharacter(page, secondCharacterName, "Wizard");
	await expect(page.getByText("No personal items yet")).toBeVisible();
	await expect(page.getByText(fixtureMundaneName)).toBeHidden();

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(firstCharacterUrl);
	await expectNoHorizontalOverflow(page);
	await expect(page.getByText("Sage's Elixir")).toBeVisible();
	await page.getByRole("button", { name: "Add item", exact: true }).click();
	await expectDialogWithinViewport(page, page.getByRole("dialog", { name: "Add personal item" }));
});

test("keeps character details visible when personal inventory fails", async ({ page }) => {
	await page.route("**/api/characters/*/items**", async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Inventory load is temporarily unavailable." }),
			});
			return;
		}
		await route.continue();
	});
	await page.goto("/");
	await createCharacter(page, `A7 Inventory Failure ${Date.now()}`, "Fighter");
	await expect(page.getByText("Personal inventory unavailable")).toBeVisible();
	await expect(page.getByText(/10 \/ 10 HP/)).toBeVisible();
	await expect(page.getByText("Personal Treasury")).toBeVisible();
});

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

async function seedCatalogue(database: ReturnType<typeof postgres>) {
	const audit = await readCatalogueAudit(database);
	const currentItemCount = await countCatalogueItems(database);
	const reuseCurrentProjection = isUsableCurrentProjection(audit, currentItemCount);
	fixtureRulesVersion = reuseCurrentProjection ? "2014" : "2024";
	const items = buildCatalogueFixture();
	await insertFixtureRows(database, items);
	if (reuseCurrentProjection) return;

	const projectionRows = await database<
		{ item_category: string; item_kind: string; is_magical: boolean }[]
	>`
		SELECT item_category, item_kind, is_magical
		FROM catalogue_items
		WHERE source = ${FOUNDRY_DND5E_SOURCE}
		  AND source_revision = ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}
		  AND rules_version = ${FOUNDRY_DND5E_RULES_VERSION}
		  AND seed_capability = 'equipment'
		  AND seed_pack = 'equipment24'
	`;
	const ownership = await claimCatalogueAudit(
		database,
		audit,
		getCategoryCounts(projectionRows),
		projectionRows.length,
	);
	if (ownership) {
		fixtureAuditOwnership = ownership;
		return;
	}

	const concurrentAudit = await readCatalogueAudit(database);
	const concurrentItemCount = await countCatalogueItems(database);
	if (isUsableCurrentProjection(concurrentAudit, concurrentItemCount)) return;
	if (
		isUsableCurrentProjection(
			concurrentAudit,
			await countCatalogueItems(database, { excludeFixture: true }),
		)
	) {
		await deleteFixtureRows(database);
		fixtureRulesVersion = "2014";
		await insertFixtureRows(database, buildCatalogueFixture());
		return;
	}

	throw new Error(
		"Catalogue readiness changed during A7 fixture setup; refusing to overwrite the concurrent audit.",
	);
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
		  AND rules_version = ${FOUNDRY_DND5E_RULES_VERSION}
		  AND seed_capability = 'equipment'
		  AND seed_pack = 'equipment24'
		  ${
				options.excludeFixture
					? database`AND seed_metadata->>'fixture' <> ${fixtureSourcePrefix}`
					: database``
			}
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

function buildCatalogueFixture() {
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
				? fixtureMundaneName
				: isMoonblade
					? fixtureMagicName
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
				rulesVersion: fixtureRulesVersion,
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
	if (!audit) return false;
	if (audit.rules_version !== FOUNDRY_DND5E_RULES_VERSION) return false;
	if (audit.capability !== "equipment" || audit.pack !== "equipment24") return false;
	if (Number(audit.accepted) !== itemCount || Number(audit.rejected) !== 0) return false;
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

async function createCharacter(page: Page, name: string, className: string) {
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill(name);
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: className }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function selectOption(page: Page, container: Locator, label: string, option: string) {
	await container.getByRole("combobox", { name: label }).click();
	await page.getByRole("option", { name: option, exact: true }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
	const viewportWidth = page.viewportSize()?.width ?? 0;
	const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
}

async function expectDialogWithinViewport(page: Page, dialog: Locator) {
	const box = await dialog.boundingBox();
	const viewport = page.viewportSize();
	expect(box).not.toBeNull();
	expect(viewport).not.toBeNull();
	if (!box || !viewport) return;
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.y).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
	expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
	await expectNoHorizontalOverflow(page);
}
