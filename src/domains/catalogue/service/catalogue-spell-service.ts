import { z } from "zod";
import {
	FOUNDRY_DND5E_SPELLS_PATH_PREFIX,
	foundryDnd5eRawUrl,
	foundryDnd5eTreeUrl,
} from "../config/index.js";
import { CATALOGUE_SOURCE_MANIFEST } from "../config/manifest.js";
import {
	type CatalogueSpellRepository,
	createCatalogueSpellRepository,
	parseFoundrySpellSource,
	type SearchCatalogueSpellsInput,
} from "../repo/index.js";
import {
	type CatalogueSpellDetails,
	CatalogueSpellIndexSchema,
	type CatalogueSpellSearchResult,
	type CatalogueSpellSeed,
} from "../types/index.js";

const FoundryTreeResponseSchema = z.object({
	tree: z.array(
		z.object({
			path: z.string(),
			type: z.string(),
		}),
	),
});

const FOUNDRY_SPELL_FETCH_CONCURRENCY = 10;

export class CatalogueSpellSeedError extends Error {
	constructor(message = "D&D spell catalogue seed data could not be loaded.") {
		super(message);
		this.name = "CatalogueSpellSeedError";
	}
}

export interface CatalogueSpellService {
	seedFoundrySrd2024Spells(): Promise<{ processed: number }>;
	hasSeededSpells(): Promise<boolean>;
	searchSpells(input: SearchCatalogueSpellsInput): Promise<CatalogueSpellSearchResult[]>;
	getSpellDetails(spellIndex: string): Promise<CatalogueSpellDetails | null>;
}

export interface CatalogueSpellServiceOptions {
	repository?: CatalogueSpellRepository;
	fetcher?: typeof fetch;
}

export function createCatalogueSpellService(
	options: CatalogueSpellServiceOptions = {},
): CatalogueSpellService {
	const repository = options.repository ?? createCatalogueSpellRepository();
	const fetcher = options.fetcher ?? fetch;

	return {
		async seedFoundrySrd2024Spells() {
			try {
				const paths = await fetchFoundrySpellPaths(fetcher);
				const spells = await fetchFoundrySpellSeeds(fetcher, paths);
				return { processed: await repository.upsertSpells(spells) };
			} catch (error) {
				if (error instanceof CatalogueSpellSeedError) throw error;
				throw new CatalogueSpellSeedError(
					`D&D spell catalogue seed failed: ${errorMessage(error)}`,
				);
			}
		},

		async hasSeededSpells() {
			return (await repository.countSpells()) > 0;
		},

		async searchSpells(input) {
			return repository.searchSpells(input);
		},

		async getSpellDetails(spellIndex) {
			return repository.findSpell(CatalogueSpellIndexSchema.parse(spellIndex));
		},
	};
}

async function fetchFoundrySpellSeeds(fetcher: typeof fetch, paths: string[]) {
	const spells: CatalogueSpellSeed[] = [];
	for (let index = 0; index < paths.length; index += FOUNDRY_SPELL_FETCH_CONCURRENCY) {
		const batch = paths.slice(index, index + FOUNDRY_SPELL_FETCH_CONCURRENCY);
		spells.push(...(await Promise.all(batch.map((path) => fetchFoundrySpellSeed(fetcher, path)))));
	}
	return spells;
}

async function fetchFoundrySpellSeed(fetcher: typeof fetch, path: string) {
	try {
		return parseFoundrySpellSource({
			path,
			yaml: await fetchFoundrySpellYaml(fetcher, path),
		});
	} catch (error) {
		if (error instanceof CatalogueSpellSeedError) throw error;
		throw new CatalogueSpellSeedError(
			`Foundry spell source failed: ${path}: ${errorMessage(error)}`,
		);
	}
}

async function fetchFoundrySpellPaths(fetcher: typeof fetch) {
	const response = await fetcher(foundryDnd5eTreeUrl());
	if (!response.ok) throw new CatalogueSpellSeedError();
	const parsed = FoundryTreeResponseSchema.parse(await response.json());
	for (const pack of CATALOGUE_SOURCE_MANIFEST.packs) {
		if (
			!parsed.tree.some((entry) => entry.type === "blob" && entry.path.startsWith(pack.pathPrefix))
		) {
			throw new CatalogueSpellSeedError(
				`Foundry source revision is missing catalogue pack: ${pack.pack} (${pack.pathPrefix})`,
			);
		}
	}
	return parsed.tree
		.filter((entry) => entry.type === "blob")
		.map((entry) => entry.path)
		.filter(isFoundrySpellSourcePath)
		.sort();
}

async function fetchFoundrySpellYaml(fetcher: typeof fetch, path: string) {
	const response = await fetcher(foundryDnd5eRawUrl(path));
	if (!response.ok) {
		throw new CatalogueSpellSeedError(`Foundry spell source failed: ${path} (${response.status})`);
	}
	return response.text();
}

function isFoundrySpellSourcePath(path: string) {
	return (
		path.startsWith(FOUNDRY_DND5E_SPELLS_PATH_PREFIX) &&
		path.endsWith(".yml") &&
		!path.includes("/supplemental-items/") &&
		!path.endsWith("/_folder.yml")
	);
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}
