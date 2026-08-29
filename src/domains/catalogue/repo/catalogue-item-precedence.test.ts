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

	it("preserves distinct same-source records that share an identifier", () => {
		const firstLevel = item({
			sourceKey: "dmgSpellScroll1s",
			sourcePath:
				"packs/_source/equipment24/consumables/scrolls/spell-scrolls/spell-scroll-1st-level.yml",
			identifier: "spell-scroll",
			name: "Spell Scroll, 1st Level",
		});
		const cantrip = item({
			sourceKey: "dmgSpellScrollCa",
			sourcePath:
				"packs/_source/equipment24/consumables/scrolls/spell-scrolls/spell-scroll-cantrip.yml",
			identifier: "spell-scroll",
			name: "Spell Scroll, Cantrip",
		});

		expect(deduplicateCatalogueItems([cantrip, firstLevel])).toEqual([firstLevel, cantrip]);
	});

	it("never merges records from different rules versions", () => {
		const current = item({ rulesVersion: "2024", name: "Current" });
		const legacy = item({ rulesVersion: "2014", name: "Legacy" });

		expect(deduplicateCatalogueItems([current, legacy])).toHaveLength(2);
	});

	it("prefers Foundry over Open5e and legacy for the same normalized identity and version", () => {
		const candidates = [
			candidate("open5e", "Potion of Healing"),
			candidate("dnd5eapi-legacy", "potion-of-healing"),
			candidate("foundry-dnd5e", "potion_of_healing"),
			candidate("open5e", "Potion of Healing", "2014"),
		];

		expect(deduplicateCatalogueItems(candidates)).toEqual([
			expect.objectContaining({ source: "open5e", rulesVersion: "2014" }),
			expect.objectContaining({ source: "foundry-dnd5e", rulesVersion: "2024" }),
		]);
	});

	it("retains all preferred-source variants before removing lower-priority duplicates", () => {
		const candidates = [
			candidate("open5e", "potion-of-healing"),
			candidate("foundry-dnd5e", "potion-of-healing", "2024", "foundry-base"),
			candidate("foundry-dnd5e", "potion-of-healing", "2024", "foundry-variant"),
		];

		expect(deduplicateCatalogueItems(candidates).map((item) => item.sourceKey)).toEqual([
			"foundry-base",
			"foundry-variant",
		]);
	});
});

function item(overrides: {
	sourceKey?: string;
	sourcePath?: string;
	rulesVersion?: "2014" | "2024";
	name?: string;
	identifier?: string;
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
		identifier: overrides.identifier ?? sourceKey,
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

function candidate(
	source: "foundry-dnd5e" | "open5e" | "dnd5eapi-legacy",
	identifier: string,
	rulesVersion: "2014" | "2024" = "2024",
	sourceKey = `${source}-${identifier}`,
) {
	return {
		source,
		sourceKey,
		sourcePath: `packs/${source}/${identifier}.yml`,
		sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
		rulesVersion,
		identifier,
	};
}
