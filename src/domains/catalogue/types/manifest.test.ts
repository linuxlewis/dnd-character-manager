import { describe, expect, it } from "vitest";
import { CatalogueSourceManifestSchema } from "./manifest.js";

describe("CatalogueSourceManifestSchema", () => {
	it("rejects a mutable source revision", () => {
		expect(() =>
			CatalogueSourceManifestSchema.parse({
				source: "foundry-dnd5e",
				sourceUrl: "https://github.com/foundryvtt/dnd5e",
				sourceRevision: "master",
				rulesVersion: "2024",
				packs: [{ pack: "spells24", capability: "spells", pathPrefix: "packs/_source/spells24/" }],
			}),
		).toThrow();
	});
});
