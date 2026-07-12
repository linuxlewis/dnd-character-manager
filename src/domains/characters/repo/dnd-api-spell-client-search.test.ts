import { describe, expect, it, vi } from "vitest";
import { createDndApiSpellClient } from "./dnd-api-spell-client.js";

describe("createDndApiSpellClient search", () => {
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

	it("searches SRD 2024 cantrips and 2014 features in the non-slot bucket", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({
					results: [
						{ key: "srd-2024_dancing-lights", name: "Dancing Lights", level: 0 },
						{ key: "srd-2024_light", name: "Light", level: 0 },
						{ key: "srd-2024_magic-missile", name: "Magic Missile", level: 1 },
					],
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					results: [{ index: "lay-on-hands", name: "Lay on Hands" }],
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					index: "lay-on-hands",
					name: "Lay on Hands",
					level: 1,
					url: "/api/2014/features/lay-on-hands",
					desc: ["Your blessed touch can heal wounds."],
				}),
			);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.searchSpells({ slotLevel: 0, query: "l" })).resolves.toEqual([
			{
				index: "dancing-lights",
				name: "Dancing Lights",
				level: 0,
				url: "/api/2024/spells/dancing-lights",
				source: "spell",
			},
			{
				index: "light",
				name: "Light",
				level: 0,
				url: "/api/2024/spells/light",
				source: "spell",
			},
			{
				index: "lay-on-hands",
				name: "Lay on Hands",
				level: 1,
				url: "/api/2014/features/lay-on-hands",
				source: "feature",
			},
		]);
		expect(fetcher).toHaveBeenNthCalledWith(
			1,
			"https://api.open5e.com/v2/spells/?name__icontains=l&document__key__in=srd-2024&level__lte=0&fields=key,name,level",
		);
		expect(fetcher).toHaveBeenNthCalledWith(2, "https://www.dnd5eapi.co/api/2014/features?name=l");
		expect(fetcher).toHaveBeenNthCalledWith(
			3,
			"https://www.dnd5eapi.co/api/2014/features/lay-on-hands",
		);
	});

	it("includes Paladin oath Channel Divinity features in non-slot search", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ results: [] }))
			.mockResolvedValueOnce(
				jsonResponse({
					results: [
						{
							index: "channel-divinity-sacred-weapon",
							name: "Channel Divinity: Sacred Weapon",
						},
					],
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					index: "channel-divinity-sacred-weapon",
					name: "Channel Divinity: Sacred Weapon",
					level: 3,
					url: "/api/2014/features/channel-divinity-sacred-weapon",
					desc: [
						"As an action, you can imbue one weapon that you are holding with positive energy.",
					],
					class: { name: "Paladin" },
				}),
			);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.searchSpells({ slotLevel: 0, query: "channel divinity" })).resolves.toEqual(
			[
				{
					index: "channel-divinity-sacred-weapon",
					name: "Channel Divinity: Sacred Weapon",
					level: 3,
					url: "/api/2014/features/channel-divinity-sacred-weapon",
					source: "feature",
				},
			],
		);
	});

	it("does not search class features in numbered slot mode", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				results: [{ key: "srd-2024_divine-smite", name: "Divine Smite", level: 1 }],
			}),
		);

		const client = createDndApiSpellClient({ fetcher });

		await expect(client.searchSpells({ slotLevel: 1, query: "divinity" })).resolves.toEqual([]);
		expect(fetcher).toHaveBeenCalledOnce();
		expect(fetcher).toHaveBeenCalledWith(
			"https://api.open5e.com/v2/spells/?name__icontains=divinity&document__key__in=srd-2024&level__lte=1&fields=key,name,level",
		);
	});
});

function jsonResponse(body: unknown) {
	return {
		ok: true,
		json: async () => body,
	} as Response;
}
