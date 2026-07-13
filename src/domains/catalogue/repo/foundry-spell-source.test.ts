import { describe, expect, it } from "vitest";
import { parseFoundrySpellSource } from "./foundry-spell-source.js";

const divineSmiteSource = `
name: Divine Smite
system:
  description:
    value: >-
      <p>The target takes an extra 2d8 Radiant damage from the attack. The
      damage increases by 1d8 if the target is a Fiend or an
      Undead.</p><p><strong>Using a Higher-Level Spell Slot. </strong>The damage
      increases by 1d8 for each spell slot level above 1.</p>
    chat: ''
  source:
    custom: ''
    rules: '2024'
    license: CC-BY-4.0
    book: ''
  activation:
    type: bonus
    condition: >-
      Immediately after hitting a target with a Melee weapon or an Unarmed
      Strike
    value: null
  duration:
    value: ''
    units: inst
  target:
    affects:
      choice: false
      count: ''
      type: ''
    template:
      units: ''
      contiguous: false
      type: ''
  range:
    units: self
    special: ''
  uses:
    max: ''
    recovery: []
    spent: 0
  level: 1
  school: evo
  properties:
    - vocal
  materials:
    value: ''
    consumed: false
    cost: 0
    supply: 0
  preparation:
    mode: prepared
    prepared: false
  activities:
    dnd5eactivity000:
      type: damage
      damage:
        parts:
          - number: 2
            denomination: 8
            types:
              - radiant
  identifier: divine-smite
_id: phbsplDivineSmi
type: spell
img: icons/magic/holy/projectiles-blades-salvo-yellow.webp
effects: []
`;

describe("parseFoundrySpellSource", () => {
	it("maps a Foundry SRD 2024 spell into a catalogue seed record", () => {
		const spell = parseFoundrySpellSource({
			path: "packs/_source/spells24/1st-level/divine-smite.yml",
			yaml: divineSmiteSource,
		});

		expect(spell).toMatchObject({
			source: "foundry-dnd5e",
			sourceKey: "phbsplDivineSmi",
			sourcePath: "packs/_source/spells24/1st-level/divine-smite.yml",
			rulesVersion: "2024",
			license: "CC-BY-4.0",
			spellIndex: "divine-smite",
			name: "Divine Smite",
			level: 1,
			url: "/api/2024/spells/divine-smite",
			sourcePayload: {
				_id: "phbsplDivineSmi",
				system: {
					identifier: "divine-smite",
				},
			},
		});
		expect(spell.desc).toEqual([
			"The target takes an extra 2d8 Radiant damage from the attack. The damage increases by 1d8 if the target is a Fiend or an Undead.",
		]);
		expect(spell.higherLevel).toEqual([
			"The damage increases by 1d8 for each spell slot level above 1.",
		]);
		expect(spell.metadata).toEqual([
			{ label: "Casting Time", value: "Bonus Action" },
			{ label: "Range", value: "Self" },
			{ label: "Duration", value: "Instantaneous" },
			{ label: "Components", value: "V" },
			{ label: "School", value: "Evocation" },
		]);
	});

	it("preserves spells when Foundry source license metadata is absent", () => {
		const spell = parseFoundrySpellSource({
			path: "packs/_source/spells24/1st-level/ice-knife.yml",
			yaml: `
name: Ice Knife
system:
  description:
    value: <p>You create a shard of ice and fling it at one creature.</p>
  source:
    custom: ''
    rules: '2024'
  level: 1
  identifier: ice-knife
_id: phbsplIceKnife0
type: spell
`,
		});

		expect(spell).toMatchObject({
			license: "",
			sourcePayload: {
				system: {
					source: {
						rules: "2024",
					},
				},
			},
			spellIndex: "ice-knife",
		});
	});

	it("decodes common rich text HTML entities from Foundry descriptions", () => {
		const spell = parseFoundrySpellSource({
			path: "packs/_source/spells24/cantrips/light.yml",
			yaml: `
name: Light
system:
  description:
    value: <p>You touch&nbsp;a spell&apos;s object.</p>
  source:
    rules: '2024'
    license: CC-BY-4.0
  level: 0
  identifier: light
_id: phbsplLight00000
type: spell
`,
		});

		expect(spell.desc).toEqual(["You touch a spell's object."]);
	});
});
