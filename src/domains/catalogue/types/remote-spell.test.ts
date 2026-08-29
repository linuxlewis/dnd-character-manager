import { describe, expect, it } from "vitest";
import { CatalogueRemoteSpellSearchResultSchema } from "./remote-spell.js";

describe("CatalogueRemoteSpellSearchResultSchema", () => {
	it("accepts the narrow remote spell capability result", () => {
		expect(
			CatalogueRemoteSpellSearchResultSchema.parse({
				index: "light",
				name: "Light",
				level: 0,
				url: "/api/2024/spells/light",
				source: "spell",
			}),
		).toMatchObject({ index: "light", source: "spell" });
	});
});
