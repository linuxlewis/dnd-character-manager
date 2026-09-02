import type { CatalogueItemSeedAudit } from "../types/index.js";
import { FOUNDRY_DND5E_GITHUB_REF } from "./index.js";

export const CATALOGUE_ITEM_SOURCE_AUDIT_BASELINE = {
	sourceRevision: FOUNDRY_DND5E_GITHUB_REF,
	minimums: {
		processed: 627,
		accepted: 627,
		categoryCounts: {
			weapons: 82,
			armor: 32,
			adventuringGear: 161,
			consumables: 57,
			potions: 30,
			scrolls: 11,
			magicItems: 351,
		},
	},
} as const;

export function assertCatalogueItemSourceAudit(audit: CatalogueItemSeedAudit) {
	const failures: string[] = [];
	if (audit.sourceRevision !== CATALOGUE_ITEM_SOURCE_AUDIT_BASELINE.sourceRevision) {
		failures.push(`source revision ${audit.sourceRevision}`);
	}
	if (audit.processed < CATALOGUE_ITEM_SOURCE_AUDIT_BASELINE.minimums.processed) {
		failures.push(`processed ${audit.processed} < 627`);
	}
	if (audit.accepted < CATALOGUE_ITEM_SOURCE_AUDIT_BASELINE.minimums.accepted) {
		failures.push(`accepted ${audit.accepted} < 627`);
	}
	for (const [category, minimum] of Object.entries(
		CATALOGUE_ITEM_SOURCE_AUDIT_BASELINE.minimums.categoryCounts,
	)) {
		const actual = audit.categoryCounts[category as keyof typeof audit.categoryCounts] ?? 0;
		if (actual < minimum) failures.push(`${category} ${actual} < ${minimum}`);
	}
	if (failures.length > 0) {
		throw new Error(`Pinned equipment24 source audit is below baseline: ${failures.join(", ")}`);
	}
}
