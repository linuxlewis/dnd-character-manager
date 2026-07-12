import { describe, expect, it, vi } from "vitest";
import type { CatalogueSpellService } from "../../catalogue/service/index.js";
import type { DndApiSpellClient } from "../repo/index.js";
import { createCatalogueBackedSpellClient } from "./catalogue-backed-spell-client.js";

describe("createCatalogueBackedSpellClient", () => {
	it("searches the local catalogue when spells have been seeded", async () => {
		const catalogueService = fakeCatalogueService();
		const fallbackClient = fakeFallbackClient();
		catalogueService.hasSeededSpells.mockResolvedValue(true);
		catalogueService.searchSpells.mockResolvedValue([
			{
				spellIndex: "wrathful-smite",
				name: "Wrathful Smite",
				level: 1,
				url: "/api/2024/spells/wrathful-smite",
			},
		]);
		const client = createCatalogueBackedSpellClient({ catalogueService, fallbackClient });

		await expect(client.searchSpells({ query: "smite", slotLevel: 1 })).resolves.toEqual([
			{
				index: "wrathful-smite",
				name: "Wrathful Smite",
				level: 1,
				url: "/api/2024/spells/wrathful-smite",
				source: "spell",
			},
		]);
		expect(catalogueService.searchSpells).toHaveBeenCalledWith({ query: "smite", slotLevel: 1 });
		expect(fallbackClient.searchSpells).not.toHaveBeenCalled();
	});

	it("falls back to remote search when seeded local search has no matches", async () => {
		const catalogueService = fakeCatalogueService();
		const fallbackClient = fakeFallbackClient();
		catalogueService.hasSeededSpells.mockResolvedValue(true);
		catalogueService.searchSpells.mockResolvedValue([]);
		fallbackClient.searchSpells.mockResolvedValue([
			{
				index: "branding-smite",
				name: "Branding Smite",
				level: 2,
				url: "/api/2014/spells/branding-smite",
				source: "spell",
			},
		]);
		const client = createCatalogueBackedSpellClient({ catalogueService, fallbackClient });

		await expect(client.searchSpells({ query: "branding", slotLevel: 2 })).resolves.toEqual([
			{
				index: "branding-smite",
				name: "Branding Smite",
				level: 2,
				url: "/api/2014/spells/branding-smite",
				source: "spell",
			},
		]);
		expect(fallbackClient.searchSpells).toHaveBeenCalledWith({ query: "branding", slotLevel: 2 });
	});

	it("falls back to remote search when the local catalogue has not been seeded", async () => {
		const catalogueService = fakeCatalogueService();
		const fallbackClient = fakeFallbackClient();
		catalogueService.hasSeededSpells.mockResolvedValue(false);
		fallbackClient.searchSpells.mockResolvedValue([
			{
				index: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2024/spells/magic-missile",
				source: "spell",
			},
		]);
		const client = createCatalogueBackedSpellClient({ catalogueService, fallbackClient });

		await expect(client.searchSpells({ query: "miss", slotLevel: 1 })).resolves.toHaveLength(1);
		expect(catalogueService.searchSpells).not.toHaveBeenCalled();
		expect(fallbackClient.searchSpells).toHaveBeenCalledWith({ query: "miss", slotLevel: 1 });
	});

	it("loads local spell details before falling back to remote details", async () => {
		const catalogueService = fakeCatalogueService();
		const fallbackClient = fakeFallbackClient();
		catalogueService.getSpellDetails.mockResolvedValue(catalogueSpellDetails());
		const client = createCatalogueBackedSpellClient({ catalogueService, fallbackClient });

		await expect(client.findSpell("wrathful-smite", "spell")).resolves.toEqual({
			index: "wrathful-smite",
			name: "Wrathful Smite",
			level: 1,
			url: "/api/2024/spells/wrathful-smite",
			source: "spell",
		});
		await expect(client.getSpellDetails("wrathful-smite", "spell")).resolves.toEqual({
			index: "wrathful-smite",
			name: "Wrathful Smite",
			level: 1,
			url: "/api/2024/spells/wrathful-smite",
			source: "spell",
			desc: ["You strike with dread power."],
			higherLevel: [],
			metadata: [{ label: "Casting Time", value: "Bonus Action" }],
		});
		expect(fallbackClient.findSpell).not.toHaveBeenCalled();
		expect(fallbackClient.getSpellDetails).not.toHaveBeenCalled();
	});

	it("falls back to remote spell details when a local spell is missing", async () => {
		const catalogueService = fakeCatalogueService();
		const fallbackClient = fakeFallbackClient();
		catalogueService.getSpellDetails.mockResolvedValue(null);
		fallbackClient.getSpellDetails.mockResolvedValue({
			index: "branding-smite",
			name: "Branding Smite",
			level: 2,
			url: "/api/2014/spells/branding-smite",
			source: "spell",
			desc: ["The weapon gleams with astral radiance as you strike."],
			higherLevel: [],
			metadata: [],
		});
		const client = createCatalogueBackedSpellClient({ catalogueService, fallbackClient });

		await expect(client.getSpellDetails("branding-smite", "spell")).resolves.toMatchObject({
			index: "branding-smite",
			url: "/api/2014/spells/branding-smite",
		});
		expect(fallbackClient.getSpellDetails).toHaveBeenCalledWith("branding-smite", "spell");
	});

	it("delegates feature lookups to the remote fallback client", async () => {
		const catalogueService = fakeCatalogueService();
		const fallbackClient = fakeFallbackClient();
		fallbackClient.findSpell.mockResolvedValue({
			index: "divine-smite",
			name: "Divine Smite",
			level: 2,
			url: "/api/2014/features/divine-smite",
			source: "feature",
		});
		const client = createCatalogueBackedSpellClient({ catalogueService, fallbackClient });

		await expect(client.findSpell("divine-smite", "feature")).resolves.toMatchObject({
			source: "feature",
		});
		expect(catalogueService.getSpellDetails).not.toHaveBeenCalled();
		expect(fallbackClient.findSpell).toHaveBeenCalledWith("divine-smite", "feature");
	});
});

function fakeCatalogueService() {
	return {
		seedFoundrySrd2024Spells: vi.fn(),
		hasSeededSpells: vi.fn(),
		searchSpells: vi.fn(),
		getSpellDetails: vi.fn(),
	} satisfies {
		[K in keyof CatalogueSpellService]: CatalogueSpellService[K] extends (
			...args: infer A
		) => infer R
			? ReturnType<typeof vi.fn<(...args: A) => R>>
			: never;
	};
}

function fakeFallbackClient() {
	return {
		searchSpells: vi.fn(),
		findSpell: vi.fn(),
		getSpellDetails: vi.fn(),
	} satisfies {
		[K in keyof DndApiSpellClient]: DndApiSpellClient[K] extends (...args: infer A) => infer R
			? ReturnType<typeof vi.fn<(...args: A) => R>>
			: never;
	};
}

function catalogueSpellDetails() {
	return {
		source: "foundry-dnd5e" as const,
		sourceKey: "phbsplWrathfulS",
		sourcePath: "packs/_source/spells24/1st-level/wrathful-smite.yml",
		rulesVersion: "2024" as const,
		license: "CC-BY-4.0",
		spellIndex: "wrathful-smite",
		name: "Wrathful Smite",
		level: 1,
		url: "/api/2024/spells/wrathful-smite",
		desc: ["You strike with dread power."],
		higherLevel: [],
		metadata: [{ label: "Casting Time", value: "Bonus Action" }],
		sourcePayload: { system: { identifier: "wrathful-smite" } },
	};
}
