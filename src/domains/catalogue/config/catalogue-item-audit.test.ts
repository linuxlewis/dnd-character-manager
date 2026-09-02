import { describe, expect, it } from "vitest";
import {
	assertCatalogueItemSourceAudit,
	CATALOGUE_ITEM_SOURCE_AUDIT_BASELINE,
} from "./catalogue-item-audit.js";

const completeAudit = {
	source: "foundry-dnd5e" as const,
	sourceRevision: CATALOGUE_ITEM_SOURCE_AUDIT_BASELINE.sourceRevision,
	rulesVersion: "2024" as const,
	capability: "equipment" as const,
	pack: "equipment24" as const,
	processed: 627,
	accepted: 627,
	rejected: 0,
	categoryCounts: {
		weapons: 82,
		armor: 32,
		adventuringGear: 161,
		consumables: 57,
		potions: 30,
		scrolls: 11,
		magicItems: 351,
	},
};

describe("catalogue item source audit", () => {
	it("accepts the pinned pack baseline and covers every representative category", () => {
		expect(() => assertCatalogueItemSourceAudit(completeAudit)).not.toThrow();
		expect(CATALOGUE_ITEM_SOURCE_AUDIT_BASELINE.minimums.categoryCounts).toEqual({
			weapons: 82,
			armor: 32,
			adventuringGear: 161,
			consumables: 57,
			potions: 30,
			scrolls: 11,
			magicItems: 351,
		});
	});

	it("rejects a truncated pack below any required minimum", () => {
		expect(() =>
			assertCatalogueItemSourceAudit({
				...completeAudit,
				processed: 1,
				accepted: 1,
				categoryCounts: { ...completeAudit.categoryCounts, magicItems: 1 },
			}),
		).toThrow(/processed 1 < 627.*magicItems 1 < 351/);
	});
});
