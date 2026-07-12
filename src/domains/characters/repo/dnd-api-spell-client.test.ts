import { describe, expect, it, vi } from "vitest";
import { createDndApiSpellClient } from "./dnd-api-spell-client.js";

describe("createDndApiSpellClient", () => {
	it("returns no search results without calling the API for an empty query", async () => {
		const fetcher = vi.fn();
		const client = createDndApiSpellClient({ fetcher });

		await expect(client.searchSpells({ slotLevel: 3, query: " " })).resolves.toEqual([]);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("searches SRD 2024 spells by name and includes spell levels up to the selected slot level", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				results: [
					{ key: "srd-2024_divine-smite", name: "Divine Smite", level: 1 },
					{ key: "srd-2024_searing-smite", name: "Searing Smite", level: 1 },
					{ key: "srd-2024_shining-smite", name: "Shining Smite", level: 2 },
				],
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.searchSpells({ slotLevel: 1, query: "smite" })).resolves.toEqual([
			{
				index: "divine-smite",
				name: "Divine Smite",
				level: 1,
				url: "/api/2024/spells/divine-smite",
				source: "spell",
			},
			{
				index: "searing-smite",
				name: "Searing Smite",
				level: 1,
				url: "/api/2024/spells/searing-smite",
				source: "spell",
			},
		]);
		expect(fetcher).toHaveBeenCalledOnce();
		expect(fetcher).toHaveBeenCalledWith(
			"https://api.open5e.com/v2/spells/?name__icontains=smite&document__key__in=srd-2024&level__lte=1&fields=key,name,level",
		);
	});

	it("loads a canonical SRD 2024 spell by index before saving", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				key: "srd-2024_magic-missile",
				name: "Magic Missile",
				level: 1,
				desc: "You create three glowing darts of magical force.",
				higher_level: [],
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.findSpell("magic-missile")).resolves.toEqual({
			index: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2024/spells/magic-missile",
			source: "spell",
		});
		expect(fetcher).toHaveBeenCalledWith(
			"https://api.open5e.com/v2/spells/srd-2024_magic-missile/?fields=key,name,level,desc,higher_level,casting_time,range_text,duration,verbal,somatic,material,material_specified,school,classes",
		);
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

	it("loads SRD 2024 spell details with description, higher-level text, and metadata", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				key: "srd-2024_magic-missile",
				name: "Magic Missile",
				level: 1,
				desc: "You create three glowing darts of magical force.",
				higher_level: "The spell creates one more dart for each spell slot level above 1.",
				casting_time: "action",
				range_text: "120 feet",
				duration: "instantaneous",
				verbal: true,
				somatic: true,
				material: false,
				material_specified: "",
				school: { name: "Evocation" },
				classes: [{ name: "Wizard" }, { name: "Sorcerer" }],
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.getSpellDetails("magic-missile", "spell")).resolves.toEqual({
			index: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2024/spells/magic-missile",
			source: "spell",
			desc: ["You create three glowing darts of magical force."],
			higherLevel: ["The spell creates one more dart for each spell slot level above 1."],
			metadata: [
				{ label: "Casting Time", value: "action" },
				{ label: "Range", value: "120 feet" },
				{ label: "Duration", value: "instantaneous" },
				{ label: "Components", value: "V, S" },
				{ label: "School", value: "Evocation" },
				{ label: "Classes", value: "Wizard, Sorcerer" },
			],
		});
	});

	it("falls back to 2014 spell details when a saved spell is unavailable in SRD 2024", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce({ ok: false } as Response)
			.mockResolvedValueOnce(
				jsonResponse({
					index: "branding-smite",
					name: "Branding Smite",
					level: 2,
					url: "/api/2014/spells/branding-smite",
					desc: ["The weapon gleams with astral radiance as you strike."],
					higher_level: ["The extra damage increases by 1d6."],
					casting_time: "1 bonus action",
					range: "Self",
					duration: "Up to 1 minute",
					components: ["V"],
					school: { name: "Evocation" },
					classes: [{ name: "Paladin" }],
				}),
			);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.getSpellDetails("branding-smite", "spell")).resolves.toEqual({
			index: "branding-smite",
			name: "Branding Smite",
			level: 2,
			url: "/api/2014/spells/branding-smite",
			source: "spell",
			desc: ["The weapon gleams with astral radiance as you strike."],
			higherLevel: ["The extra damage increases by 1d6."],
			metadata: [
				{ label: "Casting Time", value: "1 bonus action" },
				{ label: "Range", value: "Self" },
				{ label: "Duration", value: "Up to 1 minute" },
				{ label: "Components", value: "V" },
				{ label: "School", value: "Evocation" },
				{ label: "Classes", value: "Paladin" },
			],
		});
		expect(fetcher).toHaveBeenNthCalledWith(
			1,
			"https://api.open5e.com/v2/spells/srd-2024_branding-smite/?fields=key,name,level,desc,higher_level,casting_time,range_text,duration,verbal,somatic,material,material_specified,school,classes",
		);
		expect(fetcher).toHaveBeenNthCalledWith(
			2,
			"https://www.dnd5eapi.co/api/2014/spells/branding-smite",
		);
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
