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
const fixtureSourcePrefix = "codex-a7";

test.beforeAll(async () => {
	if (!sql) throw new Error("DATABASE_URL is required for character inventory e2e tests.");
	await seedCatalogue(sql);
});

test.afterAll(async () => {
	if (sql) {
		await sql`DELETE FROM catalogue_items`;
		await sql`DELETE FROM catalogue_item_seed_audits`;
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
		addDialog.getByRole("button", { name: "Select catalogue item Silvered Blade" }),
	).toBeVisible();
	await expect(
		addDialog.getByRole("button", { name: "Select catalogue item Moonblade" }),
	).toBeVisible();
	await expect(addDialog.getByText("Mundane", { exact: true })).toBeVisible();
	await expect(addDialog.getByText("Magic item", { exact: true })).toBeVisible();
	await addDialog.getByRole("button", { name: "Select catalogue item Silvered Blade" }).click();
	await expect(addDialog.getByLabel("Name")).toHaveValue("Silvered Blade");
	await expect(addDialog.getByLabel("Category")).toHaveValue("Weapons");
	await addDialog.getByLabel("Quantity").fill("2");
	await addDialog.getByRole("button", { name: "Add item", exact: true }).click();
	await expect(page.getByRole("button", { name: "View Silvered Blade" })).toBeVisible();
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
	await expect(page.getByRole("tab", { name: /Equipment/ })).toContainText("1");
	await expect(page.getByRole("tab", { name: /Potion/ })).toContainText("1");
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
	await expect(page.getByRole("button", { name: "View Silvered Blade" })).toBeVisible();
	await expect(page.getByRole("button", { name: "View Sage's Elixir" })).toBeHidden();
	await inventorySearch.fill("");
	await page.getByRole("tab", { name: /Potion/ }).click();
	await expect(page.getByRole("button", { name: "View Sage's Elixir" })).toBeVisible();
	await expect(page.getByRole("button", { name: "View Silvered Blade" })).toBeHidden();
	await page.getByRole("tab", { name: /All/ }).click();

	await page.getByRole("button", { name: "View Silvered Blade" }).click();
	await expect(page.getByText("Rules 2024")).toBeVisible();
	await page.getByRole("button", { name: "Equip", exact: true }).click();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: "Silvered Blade" })
			.getByText("Equipped", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Close Silvered Blade details" }).click();
	await page.reload();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: "Silvered Blade" })
			.getByText("Equipped"),
	).toBeVisible();

	await page.getByRole("button", { name: "View Silvered Blade" }).click();
	await page
		.getByLabel("Silvered BladeEquipment", { exact: true })
		.getByRole("button", { name: "Edit", exact: true })
		.click();
	const editDialog = page.getByRole("dialog", { name: "Edit personal item" });
	await editDialog.getByLabel("Notes").fill("Found in the old keep");
	await editDialog.getByRole("button", { name: "Save item" }).click();
	await expect(editDialog).toBeHidden();
	await expect(page.getByText("Found in the old keep", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Close Silvered Blade details" }).click();

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
	await expect(page.getByRole("button", { name: "View Silvered Blade" })).toBeVisible();
	await page.getByRole("button", { name: "View Silvered Blade" }).click();
	await expect(page.getByText("Rules 2024")).toBeVisible();
	await page.getByRole("button", { name: "Close Silvered Blade details" }).click();
	await inventory.getByRole("button", { name: "Add item", exact: true }).click();
	const unavailableDialog = page.getByRole("dialog", { name: "Add personal item" });
	await expect(unavailableDialog.getByText("SRD catalogue unavailable")).toBeVisible();
	await expect(unavailableDialog.getByLabel("Name")).toBeVisible();
	await unavailableDialog.getByRole("button", { name: /Close add item dialog/ }).click();
	await expect(unavailableDialog).toBeHidden();
	await page.unroute("**/api/catalogue/status");
	await page.unroute("**/api/catalogue/items**");

	await page.getByRole("button", { name: "View Silvered Blade" }).click();
	await page.getByRole("button", { name: "Unequip", exact: true }).click();
	await expect(
		page
			.getByTestId(/inventory-item-/)
			.filter({ hasText: "Silvered Blade" })
			.getByText("Equipped", { exact: true }),
	).toBeHidden();
	await page.getByRole("button", { name: "Delete", exact: true }).click();
	const deleteDialog = page.getByRole("dialog", { name: "Delete item?" });
	await expect(deleteDialog).toContainText("Silvered Blade");
	await deleteDialog.getByRole("button", { name: "Cancel" }).click();
	await page.getByRole("button", { name: "Delete", exact: true }).click();
	await page
		.getByRole("dialog", { name: "Delete item?" })
		.getByRole("button", { name: "Delete item" })
		.click();
	await expect(page.getByRole("button", { name: "View Silvered Blade" })).toBeHidden();

	await page.getByText("Back to characters").click();
	const secondCharacterName = `A7 Inventory Second ${Date.now()}`;
	await createCharacter(page, secondCharacterName, "Wizard");
	await expect(page.getByText("No personal items yet")).toBeVisible();
	await expect(page.getByText("Silvered Blade")).toBeHidden();

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

async function seedCatalogue(database: ReturnType<typeof postgres>) {
	const items = buildCatalogueFixture();
	const categoryCounts = {
		weapons: 82,
		armor: 32,
		adventuringGear: 161,
		consumables: 57,
		potions: 30,
		scrolls: 11,
		magicItems: 351,
	};
	await database`DELETE FROM catalogue_items`;
	await database`DELETE FROM catalogue_item_seed_audits`;
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
	await database`
		INSERT INTO catalogue_item_seed_audits (
			source, source_revision, rules_version, capability, pack, processed, accepted, rejected, category_counts
		)
		VALUES (
			${FOUNDRY_DND5E_SOURCE}, ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}, ${FOUNDRY_DND5E_RULES_VERSION},
			'equipment', 'equipment24', ${items.length}, ${items.length}, 0, ${database.json(categoryCounts)}
		)
	`;
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
			const fixtureIndex = 1_000 + itemsBuiltBefore(definitions, kind) + index;
			const isSilveredBlade = kind === "weapon" && index === 0;
			const isMoonblade = kind === "magic-item" && index === 0;
			const name = isSilveredBlade
				? "Silvered Blade"
				: isMoonblade
					? "Moonblade"
					: `${category} Fixture ${index + 1}`;
			const sourceKey = isSilveredBlade
				? "codex-a7-silvered-blade"
				: isMoonblade
					? "codex-a7-moonblade"
					: `${fixtureSourcePrefix}-${kind}-${index + 1}`;
			const sourcePath = `packs/_source/equipment24/${kind}/${sourceKey}.yml`;
			return {
				id: isSilveredBlade
					? "00000000-0000-4000-8000-000000000051"
					: isMoonblade
						? "00000000-0000-4000-8000-000000000052"
						: fixtureId(fixtureIndex),
				source: FOUNDRY_DND5E_SOURCE,
				sourceKey,
				sourcePath,
				sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
				sourceUrl: foundryDnd5eRawUrl(sourcePath),
				rulesVersion: FOUNDRY_DND5E_RULES_VERSION,
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
				isMagical: isMoonblade,
				rarity: isMoonblade ? "rare" : null,
				requiresAttunement: isMoonblade,
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

function itemsBuiltBefore(
	definitions: readonly (readonly [string, string, number])[],
	kind: string,
) {
	return definitions
		.slice(
			0,
			definitions.findIndex(([candidate]) => candidate === kind),
		)
		.reduce((total, [, , count]) => total + count, 0);
}

function fixtureId(index: number) {
	return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
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
