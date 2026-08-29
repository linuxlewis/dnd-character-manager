import { createCatalogueRemoteSpellClient } from "../repo/index.js";
import type {
	CatalogueRemoteSpellCapability,
	CatalogueRemoteSpellDetailPort,
	CatalogueRemoteSpellDetails,
	CatalogueRemoteSpellSearchPort,
	CatalogueRemoteSpellSearchResult,
	CatalogueRemoteSpellSource,
} from "../types/index.js";
import {
	CatalogueRemoteSpellDetailsSchema,
	CatalogueRemoteSpellSearchResultSchema,
} from "../types/index.js";

export class CatalogueRemoteSpellServiceError extends Error {
	constructor() {
		super("D&D spells could not be loaded.");
		this.name = "CatalogueRemoteSpellServiceError";
	}
}

export interface CatalogueRemoteSpellService
	extends CatalogueRemoteSpellCapability,
		CatalogueRemoteSpellSearchPort,
		CatalogueRemoteSpellDetailPort {
	findSpell(
		index: string,
		source?: CatalogueRemoteSpellSource,
	): Promise<CatalogueRemoteSpellSearchResult>;
}

export interface CatalogueRemoteSpellServiceOptions {
	open5eBaseUrl?: string;
	legacyBaseUrl?: string;
	fetcher?: typeof fetch;
	client?: CatalogueRemoteSpellCapability;
}

export function createCatalogueRemoteSpellService(
	options: CatalogueRemoteSpellServiceOptions = {},
): CatalogueRemoteSpellService {
	const client = options.client ?? createCatalogueRemoteSpellClient(options);
	return {
		async searchSpells(input) {
			try {
				return (await client.searchSpells(input)).map((result) =>
					CatalogueRemoteSpellSearchResultSchema.parse(result),
				);
			} catch {
				throw new CatalogueRemoteSpellServiceError();
			}
		},
		async getSpellDetails(index, source = "spell") {
			try {
				return CatalogueRemoteSpellDetailsSchema.parse(await client.getSpellDetails(index, source));
			} catch {
				throw new CatalogueRemoteSpellServiceError();
			}
		},
		async findSpell(index, source = "spell") {
			try {
				return CatalogueRemoteSpellSearchResultSchema.parse(await client.findSpell(index, source));
			} catch {
				throw new CatalogueRemoteSpellServiceError();
			}
		},
		async search(input) {
			return this.searchSpells(input);
		},
		async detail(index) {
			return this.getSpellDetails(index);
		},
	};
}

export type { CatalogueRemoteSpellDetails };
