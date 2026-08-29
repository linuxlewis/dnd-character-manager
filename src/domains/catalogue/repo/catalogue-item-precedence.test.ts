import { describe, expect, it } from "vitest";
import { deduplicateCatalogueItems } from "./catalogue-item-precedence.js";

describe("catalogue item precedence", () => {
	it("deduplicates identical source identities deterministically", () => {
		const base = item({ sourceKey: "shared", sourcePath: "packs/_source/equipment24/a.yml" });
		const duplicate = item({
			sourceKey: "shared",
			sourcePath: "packs/_source/equipment24/b.yml",
			name: "Later path",
		});

		expect(deduplicateCatalogueItems([duplicate, base])).toEqual([base]);
	});

	it("never merges records from different rules versions", () => {
		const current = item({ rulesVersion: "2024", name: "Current" });
		const legacy = item({ rulesVersion: "2014", name: "Legacy" });

		expect(deduplicateCatalogueItems([current, legacy])).toHaveLength(2);
	});
});

function item(overrides: {
	sourceKey?: string;
	sourcePath?: string;
	rulesVersion?: "2014" | "2024";
	name?: string;
}) {
	const sourceKey = overrides.sourceKey ?? "item";
	const sourcePath = overrides.sourcePath ?? "packs/_source/equipment24/rope.yml";
	const rulesVersion = overrides.rulesVersion ?? "2024";
	return {
		source: "foundry-dnd5e" as const,
		sourceKey,
		sourcePath,
		rulesVersion,
		license: "CC-BY-4.0",
		sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
		sourceUrl: `https://raw.githubusercontent.com/foundryvtt/dnd5e/f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6/${sourcePath}`,
		capability: "equipment" as const,
		pack: "equipment24" as const,
		seedMetadata: { pack: "equipment24" },
		identifier: sourceKey,
		name: overrides.name ?? "Rope",
		kind: "adventuring-gear" as const,
		category: "Adventuring Gear",
		description: "A rope.",
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
