import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createCatalogueSpellRepository } from "./catalogue-spell-repository.js";
import { catalogueSpellsTable } from "./catalogue-spell-table.js";

const spellIndexes = ["divine-smite-test", "ice-knife-test", "light-test", "searing-smite-test"];

afterEach(async () => {
	await getDb()
		.delete(catalogueSpellsTable)
		.where(inArray(catalogueSpellsTable.spellIndex, spellIndexes));
	await closeDb();
});

describe("createCatalogueSpellRepository", () => {
	it("upserts, searches, and loads local catalogue spell details", async () => {
		const repository = createCatalogueSpellRepository();

		await repository.upsertSpells([
			seedSpell({ spellIndex: "divine-smite-test", name: "Divine Smite Test", level: 1 }),
			seedSpell({ spellIndex: "ice-knife-test", name: "Ice Knife Test", level: 1, license: "" }),
			seedSpell({ spellIndex: "light-test", name: "Light Test", level: 0 }),
			seedSpell({ spellIndex: "searing-smite-test", name: "Searing Smite Test", level: 1 }),
		]);

		await repository.upsertSpells([
			seedSpell({
				spellIndex: "divine-smite-test",
				name: "Divine Smite Test",
				level: 1,
				desc: ["Updated radiant damage text."],
			}),
		]);

		const count = await repository.countSpells();
		const smiteResults = await repository.searchSpells({ query: "smite test", slotLevel: 1 });
		const lightResults = await repository.searchSpells({ query: "light test", slotLevel: 1 });
		const details = await repository.findSpell("divine-smite-test");
		const spellWithMissingLicense = await repository.findSpell("ice-knife-test");

		expect(count).toBeGreaterThanOrEqual(4);
		expect(smiteResults).toEqual([
			{
				spellIndex: "divine-smite-test",
				name: "Divine Smite Test",
				level: 1,
				url: "/api/2024/spells/divine-smite-test",
			},
			{
				spellIndex: "searing-smite-test",
				name: "Searing Smite Test",
				level: 1,
				url: "/api/2024/spells/searing-smite-test",
			},
		]);
		expect(lightResults).toEqual([]);
		expect(details?.desc).toEqual(["Updated radiant damage text."]);
		expect(details?.sourcePayload).toEqual({ system: { identifier: "divine-smite-test" } });
		expect(spellWithMissingLicense?.license).toBe("");
	});
});

function seedSpell({
	spellIndex,
	name,
	level,
	desc = ["The target takes extra radiant damage."],
	license = "CC-BY-4.0",
}: {
	spellIndex: string;
	name: string;
	level: number;
	desc?: string[];
	license?: string;
}) {
	return {
		source: "foundry-dnd5e" as const,
		sourceKey: `source-${spellIndex}`,
		sourcePath: `packs/_source/spells24/${spellIndex}.yml`,
		rulesVersion: "2024" as const,
		license,
		spellIndex,
		name,
		level,
		url: `/api/2024/spells/${spellIndex}`,
		desc,
		higherLevel: ["The damage increases at higher spell slot levels."],
		metadata: [{ label: "Casting Time", value: "Bonus Action" }],
		sourcePayload: { system: { identifier: spellIndex } },
	};
}
