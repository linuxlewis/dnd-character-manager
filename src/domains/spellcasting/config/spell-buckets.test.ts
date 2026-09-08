import { expect, it } from "vitest";
import { assertSpellCanSaveToBucket } from "./spell-buckets.js";

it("accepts upcasts and keeps features outside slots", () => {
	expect(() => assertSpellCanSaveToBucket({ source: "spell", level: 1 }, 3)).not.toThrow();
	expect(() => assertSpellCanSaveToBucket({ source: "feature", level: 10 }, 0)).not.toThrow();
	expect(() => assertSpellCanSaveToBucket({ source: "feature", level: 1 }, 1)).toThrow(
		"Features must be saved outside spell slots.",
	);
});
