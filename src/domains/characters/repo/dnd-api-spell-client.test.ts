import { describe, expect, it, vi } from "vitest";
import { createDndApiSpellClient } from "./dnd-api-spell-client.js";

describe("createDndApiSpellClient", () => {
	it("returns no search results without calling the API for an empty query", async () => {
		const fetcher = vi.fn();
		const client = createDndApiSpellClient({ fetcher });

		await expect(client.searchSpells({ slotLevel: 3, query: " " })).resolves.toEqual([]);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("searches SRD spells by name and includes spell levels up to the selected slot level", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				data: {
					spells: [
						{ index: "light", name: "Light", level: 0 },
						{ index: "magic-missile", name: "Magic Missile", level: 1 },
						{ index: "acid-arrow", name: "Acid Arrow", level: 2 },
						{ index: "fireball", name: "Fireball", level: 3 },
					],
				},
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.searchSpells({ slotLevel: 2, query: "i" })).resolves.toEqual([
			{
				index: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
				source: "spell",
			},
			{
				index: "acid-arrow",
				name: "Acid Arrow",
				level: 2,
				url: "/api/2014/spells/acid-arrow",
				source: "spell",
			},
		]);
		expect(fetcher).toHaveBeenCalledOnce();
		expect(fetcher).toHaveBeenCalledWith(
			"https://www.dnd5eapi.co/graphql",
			expect.objectContaining({
				method: "POST",
				headers: { "content-type": "application/json" },
				body: expect.stringContaining('"levels":[1,2]'),
			}),
		);
	});

	it("searches matching class features by name and feature level in the same request", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				data: {
					spells: [],
					features: [
						{ index: "divine-smite", name: "Divine Smite", level: 2 },
						{ index: "improved-divine-smite", name: "Improved Divine Smite", level: 11 },
						{ index: "lay-on-hands", name: "Lay on Hands", level: 1 },
					],
				},
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.searchSpells({ slotLevel: 1, query: "smite" })).resolves.toEqual([
			{
				index: "divine-smite",
				name: "Divine Smite",
				level: 2,
				url: "/api/2014/features/divine-smite",
				source: "feature",
			},
			{
				index: "improved-divine-smite",
				name: "Improved Divine Smite",
				level: 11,
				url: "/api/2014/features/improved-divine-smite",
				source: "feature",
			},
		]);
		expect(fetcher).toHaveBeenCalledOnce();
		expect(fetcher).toHaveBeenCalledWith(
			"https://www.dnd5eapi.co/graphql",
			expect.objectContaining({
				method: "POST",
				body: expect.stringContaining('"includeFeatures":true'),
			}),
		);
	});

	it("loads a canonical spell by index before saving", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				index: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
				desc: ["You create three glowing darts of magical force."],
				higher_level: [],
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.findSpell("magic-missile")).resolves.toEqual({
			index: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
			source: "spell",
		});
		expect(fetcher).toHaveBeenCalledWith("https://www.dnd5eapi.co/api/2014/spells/magic-missile");
	});

	it("loads a canonical feature by index before saving", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				index: "lay-on-hands",
				name: "Lay on Hands",
				level: 1,
				url: "/api/2014/features/lay-on-hands",
				desc: ["Your blessed touch can heal wounds."],
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.findSpell("lay-on-hands", "feature")).resolves.toEqual({
			index: "lay-on-hands",
			name: "Lay on Hands",
			level: 1,
			url: "/api/2014/features/lay-on-hands",
			source: "feature",
		});
		expect(fetcher).toHaveBeenCalledWith("https://www.dnd5eapi.co/api/2014/features/lay-on-hands");
	});

	it("loads spell details with description, higher-level text, and metadata", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				index: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
				desc: ["You create three glowing darts of magical force."],
				higher_level: ["One more dart is created for each slot level above 1st."],
				casting_time: "1 action",
				range: "120 feet",
				duration: "Instantaneous",
				components: ["V", "S"],
				school: { name: "Evocation" },
				classes: [{ name: "Wizard" }, { name: "Sorcerer" }],
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.getSpellDetails("magic-missile", "spell")).resolves.toEqual({
			index: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
			source: "spell",
			desc: ["You create three glowing darts of magical force."],
			higherLevel: ["One more dart is created for each slot level above 1st."],
			metadata: [
				{ label: "Casting Time", value: "1 action" },
				{ label: "Range", value: "120 feet" },
				{ label: "Duration", value: "Instantaneous" },
				{ label: "Components", value: "V, S" },
				{ label: "School", value: "Evocation" },
				{ label: "Classes", value: "Wizard, Sorcerer" },
			],
		});
	});

	it("loads feature details with feature metadata", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				index: "divine-smite",
				name: "Divine Smite",
				level: 2,
				url: "/api/2014/features/divine-smite",
				desc: ["You can expend one spell slot to deal radiant damage."],
				class: { name: "Paladin" },
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.getSpellDetails("divine-smite", "feature")).resolves.toEqual({
			index: "divine-smite",
			name: "Divine Smite",
			level: 2,
			url: "/api/2014/features/divine-smite",
			source: "feature",
			desc: ["You can expend one spell slot to deal radiant damage."],
			higherLevel: [],
			metadata: [
				{ label: "Feature Level", value: "2" },
				{ label: "Class", value: "Paladin" },
			],
		});
	});

	it("throws a stable error when the API payload is invalid", async () => {
		const client = createDndApiSpellClient({
			fetcher: vi.fn().mockResolvedValue(jsonResponse({ results: [{ level: 0 }] })),
		});

		await expect(client.searchSpells({ slotLevel: 1, query: "miss" })).rejects.toThrow(
			"D&D spells could not be loaded.",
		);
	});
});

function jsonResponse(body: unknown) {
	return {
		ok: true,
		json: async () => body,
	} as Response;
}
