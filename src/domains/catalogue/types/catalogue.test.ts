import { describe, expect, it } from "vitest";
import { CatalogueSpellSeedSchema } from "./catalogue.js";

describe("catalogue spell schemas", () => {
	const validSpellSeed = {
		source: "foundry-dnd5e",
		sourceKey: "phbsplLight00000",
		sourcePath: "packs/_source/spells24/cantrips/light.yml",
		rulesVersion: "2024",
		license: "CC-BY-4.0",
		spellIndex: "light",
		name: "Light",
		level: 0,
		url: "/api/2024/spells/light",
		desc: ["You touch one object."],
		higherLevel: [],
		metadata: [],
		sourcePayload: { system: { identifier: "light" } },
		sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
		capability: "spells",
		pack: "spells24",
		sourceUrl:
			"https://raw.githubusercontent.com/foundryvtt/dnd5e/f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6/packs/_source/spells24/cantrips/light.yml",
	} as const;

	it("rejects a seed without canonical source provenance", () => {
		expect(() => CatalogueSpellSeedSchema.parse({ spellIndex: "light" })).toThrow();
	});
	it("accepts a seeded SRD 2024 spell with preserved source payload", () => {
		const spell = CatalogueSpellSeedSchema.parse({
			source: "foundry-dnd5e",
			sourceKey: "phbsplDivineSmi",
			sourcePath: "packs/_source/spells24/1st-level/divine-smite.yml",
			rulesVersion: "2024",
			license: "CC-BY-4.0",
			spellIndex: "divine-smite",
			name: "Divine Smite",
			level: 1,
			url: "/api/2024/spells/divine-smite",
			desc: ["The target takes extra radiant damage."],
			higherLevel: ["The damage increases at higher spell slot levels."],
			metadata: [{ label: "Casting Time", value: "Bonus Action" }],
			sourcePayload: { system: { identifier: "divine-smite" } },
			sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
			capability: "spells",
			pack: "spells24",
			sourceUrl:
				"https://raw.githubusercontent.com/foundryvtt/dnd5e/f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6/packs/_source/spells24/1st-level/divine-smite.yml",
		});

		expect(spell.level).toBe(1);
		expect(spell.sourcePayload).toEqual({ system: { identifier: "divine-smite" } });
	});

	it("accepts cantrips in the local catalogue", () => {
		const spell = CatalogueSpellSeedSchema.parse(validSpellSeed);

		expect(spell.level).toBe(0);
	});

	it.each([
		["equipment provenance", { capability: "equipment", pack: "equipment24" }],
		[
			"mismatched revision URL",
			{
				sourceRevision: "0123456789abcdef0123456789abcdef01234567",
			},
		],
		["mismatched path URL", { sourcePath: "packs/_source/spells24/light.yml" }],
		["mutable revision", { sourceRevision: "master" }],
		[
			"wrong repository",
			{ sourceUrl: "https://raw.githubusercontent.com/open5e/open5e/master/file.yml" },
		],
	])("rejects %s", (_label, override) => {
		expect(() => CatalogueSpellSeedSchema.parse({ ...validSpellSeed, ...override })).toThrow();
	});
});
