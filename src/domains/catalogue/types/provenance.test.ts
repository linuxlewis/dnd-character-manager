import { describe, expect, it } from "vitest";
import { CatalogueSeedProvenanceSchema } from "./provenance.js";

describe("CatalogueSeedProvenanceSchema", () => {
	it("requires an immutable revision and typed pack capability", () => {
		expect(() =>
			CatalogueSeedProvenanceSchema.parse({
				source: "foundry-dnd5e",
				sourceKey: "id",
				sourcePath: "packs/_source/spells24/light.yml",
				rulesVersion: "2024",
				license: "CC-BY-4.0",
				sourcePayload: {},
				sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
				capability: "spells",
				pack: "spells24",
				sourceUrl:
					"https://raw.githubusercontent.com/foundryvtt/dnd5e/f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6/packs/_source/spells24/light.yml",
			}),
		).not.toThrow();
		expect(() =>
			CatalogueSeedProvenanceSchema.parse({
				source: "foundry-dnd5e",
				sourceKey: "id",
				sourcePath: "x",
				rulesVersion: "2024",
				license: "",
				sourcePayload: {},
				sourceRevision: "",
				capability: "spells",
				pack: "spells24",
				sourceUrl: "https://example.com/file.yml",
			}),
		).toThrow();
	});

	it.each([
		["mutable revision", { sourceRevision: "master" }],
		["Open5e source", { source: "open5e" }],
		["equipment pack for spells", { pack: "equipment24" }],
		["equipment capability for spells", { capability: "equipment", pack: "spells24" }],
		["non-Foundry URL", { sourceUrl: "https://example.com/file.yml" }],
	])("rejects %s", (_label, override) => {
		const seed = {
			source: "foundry-dnd5e",
			sourceKey: "id",
			sourcePath: "packs/_source/spells24/light.yml",
			rulesVersion: "2024",
			license: "CC-BY-4.0",
			sourcePayload: {},
			sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
			capability: "spells",
			pack: "spells24",
			sourceUrl:
				"https://raw.githubusercontent.com/foundryvtt/dnd5e/f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6/packs/_source/spells24/light.yml",
		};
		expect(() => CatalogueSeedProvenanceSchema.parse({ ...seed, ...override })).toThrow();
	});
});
