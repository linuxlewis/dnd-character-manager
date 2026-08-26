import { describe, expect, it, vi } from "vitest";
import { createDndApiSpellSlotClient, toDndClassLevelIndex } from "./dnd-api-spell-slot-client.js";

describe("toDndClassLevelIndex", () => {
	it("maps character class and level to the D&D 5e API class-level index", () => {
		expect(toDndClassLevelIndex("Wizard", 7)).toBe("wizard-7");
		expect(toDndClassLevelIndex("Sorcerer", 20)).toBe("sorcerer-20");
	});
});

describe("createDndApiSpellSlotClient", () => {
	it("fetches and parses class-level spell slot defaults from dnd5eapi GraphQL", async () => {
		const fetcher = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: {
					level: {
						index: "wizard-7",
						level: 7,
						spellcasting: {
							spell_slots_level_1: 4,
							spell_slots_level_2: 3,
							spell_slots_level_3: 3,
							spell_slots_level_4: 1,
							spell_slots_level_5: 0,
							spell_slots_level_6: 0,
							spell_slots_level_7: 0,
							spell_slots_level_8: 0,
							spell_slots_level_9: 0,
						},
					},
				},
			}),
		});

		await expect(
			createDndApiSpellSlotClient({ fetcher }).findDefaultSpellSlots("Wizard", 7),
		).resolves.toEqual([
			{ level: 1, total: 4 },
			{ level: 2, total: 3 },
			{ level: 3, total: 3 },
			{ level: 4, total: 1 },
			{ level: 5, total: 0 },
			{ level: 6, total: 0 },
			{ level: 7, total: 0 },
			{ level: 8, total: 0 },
			{ level: 9, total: 0 },
		]);
		expect(fetcher).toHaveBeenCalledWith(
			"https://www.dnd5eapi.co/graphql",
			expect.objectContaining({
				method: "POST",
			}),
		);
	});

	it("returns zero slot defaults when the API class level is not a spellcaster", async () => {
		const fetcher = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: {
					level: {
						index: "fighter-3",
						level: 3,
						spellcasting: null,
					},
				},
			}),
		});

		await expect(
			createDndApiSpellSlotClient({ fetcher }).findDefaultSpellSlots("Fighter", 3),
		).resolves.toEqual(Array.from({ length: 9 }, (_, index) => ({ level: index + 1, total: 0 })));
	});

	it("fails closed when the API response shape does not match the boundary schema", async () => {
		const fetcher = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: { level: { index: "wizard-7", level: 7, spellcasting: { spell_slots_level_1: -1 } } },
			}),
		});

		await expect(
			createDndApiSpellSlotClient({ fetcher }).findDefaultSpellSlots("Wizard", 7),
		).rejects.toThrow("D&D spell slot defaults could not be loaded.");
	});
});
