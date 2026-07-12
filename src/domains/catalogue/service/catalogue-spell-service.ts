import { z } from "zod";
import {
	FOUNDRY_DND5E_SPELLS_PATH_PREFIX,
	foundryDnd5eRawUrl,
	foundryDnd5eTreeUrl,
} from "../config/index.js";
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
	foundryRef?: string;
}

export function createCatalogueSpellService(
	options: CatalogueSpellServiceOptions = {},
): CatalogueSpellService {
	const repository = options.repository ?? createCatalogueSpellRepository();
	const fetcher = options.fetcher ?? fetch;
	const foundryRef = options.foundryRef;

	return {
		async seedFoundrySrd2024Spells() {
			try {
				const paths = await fetchFoundrySpellPaths(fetcher, foundryRef);
				const spells: CatalogueSpellSeed[] = [];
				for (const path of paths) {
					spells.push(
						parseFoundrySpellSource({
							path,
							yaml: await fetchFoundrySpellYaml(fetcher, path, foundryRef),
						}),
					);
				}
				return { processed: await repository.upsertSpells(spells) };
			} catch (error) {
				if (error instanceof CatalogueSpellSeedError) throw error;
				throw new CatalogueSpellSeedError();
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

async function fetchFoundrySpellPaths(fetcher: typeof fetch, ref: string | undefined) {
	const response = await fetcher(foundryDnd5eTreeUrl(ref));
	if (!response.ok) throw new CatalogueSpellSeedError();
	const parsed = FoundryTreeResponseSchema.parse(await response.json());
	return parsed.tree
		.filter((entry) => entry.type === "blob")
		.map((entry) => entry.path)
		.filter(isFoundrySpellSourcePath)
		.sort();
}

async function fetchFoundrySpellYaml(fetcher: typeof fetch, path: string, ref: string | undefined) {
	const response = await fetcher(foundryDnd5eRawUrl(path, ref));
	if (!response.ok) throw new CatalogueSpellSeedError(`Foundry spell source failed: ${path}`);
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
