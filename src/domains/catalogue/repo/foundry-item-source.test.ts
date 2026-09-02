import { describe, expect, it } from "vitest";
import { parseFoundryItemSource } from "./foundry-item-source.js";

const fixture = ({
	name = "Longsword",
	type = "martialMelee",
	identifier = "longsword",
	description = "<p>A useful item &amp; its rules.</p>",
	rarity = "",
	attunement = "",
	properties = "[]",
} = {}) => `
name: ${name}
system:
  description:
    value: ${description}
  source:
    rules: '2024'
    license: CC-BY-4.0
  price:
    value: 15
    denomination: gp
  weight:
    value: 3
    units: lb
  rarity: ${rarity}
  attunement: ${attunement}
  properties: ${properties}
  type:
    value: ${type}
    baseItem: ${type === "potion" ? "" : "longsword"}
  identifier: ${identifier}
_id: ${identifier === "potion-of-healing" ? "dmgPotionHealing" : "phbwepLongsword"}
type: equipment
img: icons/test/item.webp
`;

describe("parseFoundryItemSource", () => {
	it("accepts long descriptions while preserving the source payload", () => {
		const description = `<p>${"A very long item description. ".repeat(250)}</p>`;
		const result = parseFoundryItemSource({
			path: "packs/_source/equipment24/magical-items/ioun-stone.yml",
			yaml: fixture({
				name: "Ioun Stone",
				description,
				rarity: "rare",
			}),
		});

		expect(result.description.length).toBeGreaterThan(4_000);
		expect(result.sourcePayload).toMatchObject({
			system: { description: { value: description } },
		});
	});

	it("maps mundane weapon fields and provenance", () => {
		const item = parseFoundryItemSource({
			path: "packs/_source/equipment24/weapons/martial-melee/longsword.yml",
			yaml: fixture(),
		});

		expect(item).toMatchObject({
			name: "Longsword",
			identifier: "longsword",
			kind: "weapon",
			category: "Weapons",
			isMagical: false,
			sourceKey: "phbwepLongsword",
			sourceRevision: "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6",
			license: "CC-BY-4.0",
			costValue: 15,
			weight: 3,
			sourcePayload: { system: { identifier: "longsword" } },
		});
	});

	it.each([
		[
			"adventuring gear",
			"packs/_source/equipment24/adventuring-gear/rope.yml",
			"adventuring-gear",
			{ name: "Rope", type: "trinket", identifier: "rope" },
		],
		[
			"armor",
			"packs/_source/equipment24/armor/heavy/chain-mail.yml",
			"armor",
			{ name: "Chain Mail", type: "heavy", identifier: "chain-mail" },
		],
		[
			"consumable",
			"packs/_source/equipment24/consumables/acid.yml",
			"consumable",
			{ name: "Acid", type: "consumable", identifier: "acid" },
		],
		[
			"potion",
			"packs/_source/equipment24/consumables/potions/healing/potion-of-healing.yml",
			"potion",
			{ name: "Potion of Healing", type: "potion", identifier: "potion-of-healing" },
		],
		[
			"scroll",
			"packs/_source/equipment24/consumables/scrolls/spell-scroll.yml",
			"scroll",
			{ name: "Spell Scroll", type: "scroll", identifier: "spell-scroll" },
		],
	])("normalizes %s into the shared item capability", (_label, path, kind, options) => {
		const item = parseFoundryItemSource({ path, yaml: fixture(options) });
		expect(item.kind).toBe(kind);
	});

	it("uses the explicit magic-item kind without losing the source category", () => {
		const item = parseFoundryItemSource({
			path: "packs/_source/equipment24/armor/magical/adamantine-armor.yml",
			yaml: fixture({
				name: "Adamantine Armor",
				type: "",
				identifier: "adamantine-armor",
				rarity: "uncommon",
				properties: "[mgc]",
				attunement: "required",
			}),
		});

		expect(item).toMatchObject({
			kind: "magic-item",
			category: "Armor",
			isMagical: true,
			rarity: "uncommon",
			requiresAttunement: true,
		});
	});

	it("rejects source files outside the pinned equipment pack", () => {
		expect(() =>
			parseFoundryItemSource({ path: "packs/_source/spells24/light.yml", yaml: fixture() }),
		).toThrow();
	});
});
