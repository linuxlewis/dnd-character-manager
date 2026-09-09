import { describe, expect, it } from "vitest";
import {
	CharacterSpellDetailsResponseSchema,
	CharacterSpellsResponseSchema,
	SaveCharacterSpellRequestSchema,
	SearchCharacterSpellsRequestSchema,
	SearchCharacterSpellsResponseSchema,
	UseCharacterSpellSlotRequestSchema,
} from "./character.js";

describe("Character spell schemas", () => {
	it("accepts a saved character spell under a slot level", () => {
		const response = {
			spells: [
				{
					id: "00000000-0000-4000-8000-000000000030",
					slotLevel: 3,
					spellIndex: "magic-missile",
					name: "Magic Missile",
					level: 1,
					url: "/api/2014/spells/magic-missile",
					source: "spell",
				},
			],
		};

		expect(CharacterSpellsResponseSchema.parse(response)).toEqual(response);
	});

	it("accepts a saved class feature in the non-slot bucket", () => {
		const response = {
			spells: [
				{
					id: "00000000-0000-4000-8000-000000000031",
					slotLevel: 0,
					spellIndex: "lay-on-hands",
					name: "Lay on Hands",
					level: 1,
					url: "/api/2014/features/lay-on-hands",
					source: "feature",
				},
			],
		};

		expect(CharacterSpellsResponseSchema.parse(response)).toEqual(response);
	});

	it("accepts class features above 9th level", () => {
		const response = {
			spells: [
				{
					id: "00000000-0000-4000-8000-000000000032",
					slotLevel: 0,
					spellIndex: "improved-divine-smite",
					name: "Improved Divine Smite",
					level: 11,
					url: "/api/2014/features/improved-divine-smite",
					source: "feature",
				},
			],
		};

		expect(CharacterSpellsResponseSchema.parse(response)).toEqual(response);
	});

	it("accepts a spell search request and response", () => {
		expect(SearchCharacterSpellsRequestSchema.parse({ slotLevel: 3, query: "miss" })).toEqual({
			slotLevel: 3,
			query: "miss",
		});

		const response = {
			spells: [
				{
					index: "magic-missile",
					name: "Magic Missile",
					level: 1,
					url: "/api/2024/spells/magic-missile",
					source: "spell",
				},
				{
					index: "divine-smite",
					name: "Divine Smite",
					level: 2,
					url: "/api/2014/features/divine-smite",
					source: "feature",
				},
			],
		};

		expect(SearchCharacterSpellsResponseSchema.parse(response)).toEqual(response);
	});

	it("accepts saving a spell by D&D API index and slot level", () => {
		expect(
			SaveCharacterSpellRequestSchema.parse({
				slotLevel: 3,
				spellIndex: "magic-missile",
				source: "spell",
			}),
		).toEqual({
			slotLevel: 3,
			spellIndex: "magic-missile",
			source: "spell",
		});
	});

	it("accepts saved spell details with description and display metadata", () => {
		const response = {
			spell: {
				id: "00000000-0000-4000-8000-000000000030",
				slotLevel: 3,
				spellIndex: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
				source: "spell",
				desc: ["You create three glowing darts of magical force."],
				higherLevel: ["One more dart is created for each slot level above 1st."],
				metadata: [
					{ label: "Casting Time", value: "1 action" },
					{ label: "Range", value: "120 feet" },
				],
			},
		};

		expect(CharacterSpellDetailsResponseSchema.parse(response)).toEqual(response);
	});

	it("accepts cantrips in the non-slot spell bucket", () => {
		const response = {
			spells: [
				{
					id: "00000000-0000-4000-8000-000000000031",
					slotLevel: 0,
					spellIndex: "light",
					name: "Light",
					level: 0,
					url: "/api/2014/spells/light",
					source: "spell",
				},
			],
		};

		expect(CharacterSpellsResponseSchema.parse(response)).toEqual(response);
		expect(
			SaveCharacterSpellRequestSchema.parse({
				slotLevel: 0,
				spellIndex: "light",
				source: "spell",
			}),
		).toEqual({
			slotLevel: 0,
			spellIndex: "light",
			source: "spell",
		});
	});

	it("keeps spell slot usage requests constrained to numbered slots", () => {
		expect(() => UseCharacterSpellSlotRequestSchema.parse({ level: 0 })).toThrow();
		expect(() => UseCharacterSpellSlotRequestSchema.parse({ level: 10 })).toThrow();
	});
});
