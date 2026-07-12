import { describe, expect, it, vi } from "vitest";
import type { CatalogueSpellRepository } from "../repo/index.js";
import { CatalogueSpellSeedError, createCatalogueSpellService } from "./catalogue-spell-service.js";

const divineSmiteYaml = `
name: Divine Smite
system:
  description:
    value: <p>The target takes extra Radiant damage.</p>
  source:
    rules: '2024'
    license: CC-BY-4.0
  activation:
    type: bonus
  duration:
    units: inst
  range:
    units: self
  level: 1
  school: evo
  properties:
    - vocal
  materials:
    value: ''
  identifier: divine-smite
_id: phbsplDivineSmi
type: spell
`;

const lightYaml = `
name: Light
system:
  description:
    value: <p>You touch one object.</p>
  source:
    rules: '2024'
    license: CC-BY-4.0
  activation:
    type: action
  duration:
    value: '1'
    units: hour
  range:
    units: touch
  level: 0
  school: evo
  properties:
    - vocal
  materials:
    value: ''
  identifier: light
_id: phbsplLight00000
type: spell
`;

describe("createCatalogueSpellService", () => {
	it("downloads Foundry spell source files and upserts parsed spells", async () => {
		const repository = fakeRepository();
		const fetcher = fakeFoundryFetcher({
			"packs/_source/spells24/1st-level/divine-smite.yml": divineSmiteYaml,
			"packs/_source/spells24/cantrips/light.yml": lightYaml,
			"packs/_source/spells24/cantrips/_folder.yml": "name: ignored",
			"packs/_source/spells24/supplemental-items/magical-berries.yml": "name: Magical Berries",
			"packs/_source/equipment24/rope.yml": "name: Rope",
		});
		const service = createCatalogueSpellService({ fetcher, repository });

		const result = await service.seedFoundrySrd2024Spells();

		expect(result).toEqual({ processed: 2 });
		expect(repository.upsertSpells).toHaveBeenCalledWith([
			expect.objectContaining({
				spellIndex: "divine-smite",
				name: "Divine Smite",
				sourcePath: "packs/_source/spells24/1st-level/divine-smite.yml",
			}),
			expect.objectContaining({
				spellIndex: "light",
				name: "Light",
				sourcePath: "packs/_source/spells24/cantrips/light.yml",
			}),
		]);
	});

	it("reports catalogue seed errors for failed Foundry downloads", async () => {
		const repository = fakeRepository();
		const service = createCatalogueSpellService({
			repository,
			fetcher: async () => new Response("not found", { status: 404 }),
		});

		await expect(service.seedFoundrySrd2024Spells()).rejects.toBeInstanceOf(
			CatalogueSpellSeedError,
		);
		expect(repository.upsertSpells).not.toHaveBeenCalled();
	});

	it("delegates local search and detail reads to the repository", async () => {
		const repository = fakeRepository();
		repository.countSpells.mockResolvedValue(1);
		repository.searchSpells.mockResolvedValue([
			{
				spellIndex: "divine-smite",
				name: "Divine Smite",
				level: 1,
				url: "/api/2024/spells/divine-smite",
			},
		]);
		repository.findSpell.mockResolvedValue({
			source: "foundry-dnd5e",
			sourceKey: "phbsplDivineSmi",
			sourcePath: "packs/_source/spells24/1st-level/divine-smite.yml",
			rulesVersion: "2024",
			license: "CC-BY-4.0",
			spellIndex: "divine-smite",
			name: "Divine Smite",
			level: 1,
			url: "/api/2024/spells/divine-smite",
			desc: ["The target takes extra Radiant damage."],
			higherLevel: [],
			metadata: [],
			sourcePayload: { system: { identifier: "divine-smite" } },
		});
		const service = createCatalogueSpellService({ repository });

		await expect(service.hasSeededSpells()).resolves.toBe(true);
		await expect(service.searchSpells({ query: "smite", slotLevel: 1 })).resolves.toHaveLength(1);
		await expect(service.getSpellDetails("divine-smite")).resolves.toMatchObject({
			spellIndex: "divine-smite",
			name: "Divine Smite",
		});
	});
});

function fakeRepository() {
	return {
		upsertSpells: vi.fn<CatalogueSpellRepository["upsertSpells"]>(async (spells) => spells.length),
		countSpells: vi.fn<CatalogueSpellRepository["countSpells"]>(async () => 0),
		searchSpells: vi.fn<CatalogueSpellRepository["searchSpells"]>(async () => []),
		findSpell: vi.fn<CatalogueSpellRepository["findSpell"]>(async () => null),
	};
}

function fakeFoundryFetcher(files: Record<string, string>) {
	const paths = Object.keys(files);
	return async (url: string | URL | Request) => {
		const value = String(url);
		if (value.includes("/git/trees/")) {
			return Response.json({
				tree: paths.map((path) => ({ path, type: "blob" })),
			});
		}

		const path = paths.find((candidate) => value.endsWith(candidate));
		return path
			? new Response(files[path], { status: 200 })
			: new Response("not found", { status: 404 });
	};
}
