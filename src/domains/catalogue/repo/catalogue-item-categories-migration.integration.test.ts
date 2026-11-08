import { readFileSync } from "node:fs";
import { closeDb, getDatabaseUrl } from "@providers/database/index.js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { parseFoundryItemSource } from "./foundry-item-source.js";

const sql = postgres(getDatabaseUrl(), { max: 1 });

afterAll(async () => {
	await closeDb();
	await sql.end();
});

// Paths and Foundry type values seen in the pinned equipment24 pack's former "Other" items.
const previouslyOtherSources = [
	["traps/hidden-pit.yml", "equipment", ""],
	["containers/bag-of-holding/_container.yml", "container", ""],
	["containers/folding-boat/folding-boat.yml", "equipment", "trinket"],
	["equipment/rings/ring-of-protection.yml", "equipment", "ring"],
	["supplemental/ring.yml", "equipment", "ring"],
	["equipment/rods/rod-of-lordly-might.yml", "weapon", "simpleM"],
	["equipment/rods/immovable-rod.yml", "equipment", "rod"],
	["equipment/wands/wand-of-fireballs.yml", "equipment", "wand"],
	["equipment/cloak-of-protection.yml", "equipment", "wondrous"],
	["equipment/helm-of-brilliance.yml", "equipment", "light"],
	["equipment/mysterious-deck-cards/balance.yml", "consumable", "trinket"],
	["supplemental/scroll.yml", "consumable", "scroll"],
	["supplemental/unarmed-strike.yml", "weapon", "natural"],
] as const;

describe("catalogue item categories migration", () => {
	it("recategorizes seeded Other rows exactly like a fresh seed", async () => {
		const schema = `catalogue_categories_${crypto.randomUUID().replaceAll("-", "")}`;
		await sql.unsafe(`CREATE SCHEMA "${schema}"`);
		try {
			await sql.begin(async (tx) => {
				await tx.unsafe(`SET LOCAL search_path TO "${schema}", public`);
				await tx.unsafe(readFileSync("migrations/0012_catalogue_items.sql", "utf8"));

				const expected = new Map<string, string>();
				for (const [relativePath, sourceType, itemType] of previouslyOtherSources) {
					const seed = parseFoundryItemSource({
						path: `packs/_source/equipment24/${relativePath}`,
						yaml: foundryYaml(relativePath, sourceType, itemType),
					});
					expected.set(seed.sourceKey, seed.category);
					await insertCatalogueRow(tx, {
						sourceKey: seed.sourceKey,
						sourcePath: seed.sourcePath,
						category: "Other",
						stats: seed.stats,
					});
				}
				await insertCatalogueRow(tx, {
					sourceKey: "already-categorized",
					sourcePath: "packs/_source/equipment24/equipment/rings/kept.yml",
					category: "Armor",
					stats: { itemType: "ring" },
				});

				await tx.unsafe(readFileSync("migrations/0016_catalogue_item_categories.sql", "utf8"));

				const rows = await tx<{ source_key: string; item_category: string }[]>`
					SELECT source_key, item_category FROM catalogue_items
				`;
				const actual = new Map(rows.map((row) => [row.source_key, row.item_category]));
				for (const [sourceKey, category] of expected) {
					expect(category).not.toBe("Other");
					expect({ sourceKey, category: actual.get(sourceKey) }).toEqual({ sourceKey, category });
				}
				expect(actual.get("already-categorized")).toBe("Armor");
			});
		} finally {
			await sql.unsafe(`DROP SCHEMA "${schema}" CASCADE`);
		}
	});
});

function foundryYaml(relativePath: string, sourceType: string, itemType: string) {
	const identifier = relativePath.replace(/\.yml$/, "").replaceAll("/", "-");
	return `
name: ${identifier}
type: ${sourceType}
_id: ${identifier}
system:
  description:
    value: Test item.
  source:
    rules: '2024'
    license: CC-BY-4.0
  rarity: rare
  properties: [mgc]
  type:
    value: ${itemType}
  identifier: ${identifier}
`;
}

async function insertCatalogueRow(
	tx: postgres.TransactionSql,
	row: { sourceKey: string; sourcePath: string; category: string; stats: unknown },
) {
	await tx`
		INSERT INTO catalogue_items (
			source, source_key, source_path, source_revision, source_url, rules_version, license,
			seed_capability, seed_pack, seed_metadata, item_identifier, item_name, item_kind,
			item_category, item_description, is_magical, requires_attunement, properties, stats,
			source_payload
		) VALUES (
			'foundry-dnd5e', ${row.sourceKey}, ${row.sourcePath},
			'0123456789abcdef0123456789abcdef01234567', 'https://example.test/item.yml', '2024',
			'CC-BY-4.0', 'equipment', 'equipment24', '{}'::jsonb, ${row.sourceKey}, ${row.sourceKey},
			'magic-item', ${row.category}, '', true, false, '[]'::jsonb,
			${tx.json(row.stats as postgres.JSONValue)}, '{}'::jsonb
		)
	`;
}
