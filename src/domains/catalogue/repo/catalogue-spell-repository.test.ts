import { describe, expect, it } from "vitest";
import {
	toCatalogueSpellDetails,
	toCatalogueSpellSearchResult,
} from "./catalogue-spell-repository.js";

const row = {
	source: "foundry-dnd5e",
	sourceKey: "phbsplDivineSmi",
	sourcePath: "packs/_source/spells24/1st-level/divine-smite.yml",
	rulesVersion: "2024",
	license: "CC-BY-4.0",
	spellIndex: "divine-smite",
	spellName: "Divine Smite",
	spellLevel: 1,
	spellUrl: "/api/2024/spells/divine-smite",
	spellDesc: ["The target takes extra radiant damage."],
	spellHigherLevel: ["The damage increases at higher spell slot levels."],
	spellMetadata: [{ label: "Casting Time", value: "Bonus Action" }],
	sourcePayload: { system: { identifier: "divine-smite" } },
};

describe("catalogue spell repository mappers", () => {
	it("maps stored rows into search results", () => {
		expect(toCatalogueSpellSearchResult(row)).toEqual({
			spellIndex: "divine-smite",
			name: "Divine Smite",
			level: 1,
			url: "/api/2024/spells/divine-smite",
		});
	});

	it("maps stored rows into full spell details with source payload", () => {
		expect(toCatalogueSpellDetails(row)).toEqual({
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
		});
	});
});
