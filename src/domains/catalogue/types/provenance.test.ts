import { describe, expect, it } from "vitest";
import { CatalogueSourceProvenanceSchema } from "./provenance.js";

describe("CatalogueSourceProvenanceSchema", () => {
	it("requires an immutable revision and typed pack capability", () => {
		expect(() =>
			CatalogueSourceProvenanceSchema.parse({
				source: "foundry-dnd5e",
				sourceKey: "id",
				sourcePath: "packs/_source/spells24/light.yml",
				rulesVersion: "2024",
				license: "CC-BY-4.0",
				sourcePayload: {},
				sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
				capability: "spells",
				pack: "spells24",
				sourceUrl: "https://raw.githubusercontent.com/foundryvtt/dnd5e/revision/file.yml",
			}),
		).not.toThrow();
		expect(() =>
			CatalogueSourceProvenanceSchema.parse({
				source: "foundry-dnd5e",
				sourceKey: "id",
				sourcePath: "x",
				rulesVersion: "2024",
				license: "",
				sourcePayload: {},
				sourceRevision: "master",
				capability: "spells",
				pack: "spells24",
				sourceUrl: "https://example.com/file.yml",
			}),
		).toThrow();
	});
});
