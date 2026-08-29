import type { CatalogueItemSeed, CatalogueItemSeedAudit } from "../types/index.js";

export const sourceKeys = [
	"catalogue-item-repository-isolation-rope",
	"catalogue-item-repository-isolation-rope-legacy",
];
export const testRevisions = [
	"1111111111111111111111111111111111111111",
	"2222222222222222222222222222222222222222",
];

export function auditFor(
	rulesVersion: "2014" | "2024",
	accepted: number,
	sourceRevision = testRevisions[0],
): CatalogueItemSeedAudit {
	return {
		source: "foundry-dnd5e",
		sourceRevision,
		rulesVersion,
		capability: "equipment",
		pack: "equipment24",
		processed: accepted,
		accepted,
		rejected: 0,
		categoryCounts: {
			weapons: 0,
			armor: 0,
			adventuringGear: accepted,
			consumables: 0,
			potions: 0,
			scrolls: 0,
			magicItems: 0,
		},
	};
}

export function seedItem({
	sourceKey,
	rulesVersion,
	name,
	sourceRevision = testRevisions[0],
}: {
	sourceKey: string;
	rulesVersion: "2014" | "2024";
	name: string;
	sourceRevision?: string;
}): CatalogueItemSeed {
	return {
		source: "foundry-dnd5e",
		sourceKey,
		sourcePath: `packs/_source/equipment24/${sourceKey}.yml`,
		sourceRevision,
		sourceUrl: `https://raw.githubusercontent.com/foundryvtt/dnd5e/${sourceRevision}/packs/_source/equipment24/${sourceKey}.yml`,
		rulesVersion,
		license: "CC-BY-4.0",
		capability: "equipment",
		pack: "equipment24",
		seedMetadata: { pack: "equipment24" },
		identifier: sourceKey,
		name,
		kind: "adventuring-gear",
		category: "Adventuring Gear",
		description: "C2 repository precedence rope marker.",
		isMagical: false,
		rarity: null,
		requiresAttunement: false,
		costValue: 1,
		costDenomination: "gp",
		weight: 5,
		thumbnailUrl: null,
		properties: [],
		stats: {},
		sourcePayload: { system: { identifier: sourceKey } },
	};
}
