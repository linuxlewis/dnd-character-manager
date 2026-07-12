import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createCatalogueSpellRepository } from "./catalogue-spell-repository.js";
import { catalogueSpellsTable } from "./catalogue-spell-table.js";

const spellIndexes = ["divine-smite", "ice-knife", "light", "searing-smite"];

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
			seedSpell({ spellIndex: "divine-smite", name: "Divine Smite", level: 1 }),
			seedSpell({ spellIndex: "ice-knife", name: "Ice Knife", level: 1, license: "" }),
			seedSpell({ spellIndex: "light", name: "Light", level: 0 }),
			seedSpell({ spellIndex: "searing-smite", name: "Searing Smite", level: 1 }),
		]);

		await repository.upsertSpells([
			seedSpell({
				spellIndex: "divine-smite",
				name: "Divine Smite",
				level: 1,
				desc: ["Updated radiant damage text."],
			}),
		]);

		const count = await repository.countSpells();
		const smiteResults = await repository.searchSpells({ query: "smite", slotLevel: 1 });
		const lightResults = await repository.searchSpells({ query: "light", slotLevel: 1 });
		const details = await repository.findSpell("divine-smite");
		const spellWithMissingLicense = await repository.findSpell("ice-knife");

		expect(count).toBeGreaterThanOrEqual(4);
		expect(smiteResults).toEqual([
			{
				spellIndex: "divine-smite",
				name: "Divine Smite",
				level: 1,
				url: "/api/2024/spells/divine-smite",
			},
			{
				spellIndex: "searing-smite",
				name: "Searing Smite",
				level: 1,
				url: "/api/2024/spells/searing-smite",
			},
		]);
		expect(lightResults).toEqual([]);
		expect(details?.desc).toEqual(["Updated radiant damage text."]);
		expect(details?.sourcePayload).toEqual({ system: { identifier: "divine-smite" } });
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
