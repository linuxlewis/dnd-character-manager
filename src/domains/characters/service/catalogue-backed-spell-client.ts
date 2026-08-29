import {
	CatalogueRemoteSpellClientError,
	createCatalogueRemoteSpellClient,
} from "../../catalogue/repo/index.js";
import type { CatalogueSpellService } from "../../catalogue/service/index.js";
import { createCatalogueSpellService } from "../../catalogue/service/index.js";
import type { DndApiSpellClient } from "../repo/index.js";
import { DndApiSpellClientError } from "../repo/index.js";
import type { DndSpellDetails, DndSpellSearchResult } from "../types/index.js";
import { DndSpellDetailsSchema, DndSpellSearchResultSchema } from "../types/index.js";

type CatalogueSpellSearchResult = Awaited<
	ReturnType<CatalogueSpellService["searchSpells"]>
>[number];
type CatalogueSpellDetails = NonNullable<
	Awaited<ReturnType<CatalogueSpellService["getSpellDetails"]>>
>;

export interface CatalogueBackedSpellClientOptions {
	catalogueService?: CatalogueSpellService;
	fallbackClient?: DndApiSpellClient;
}

export function createCatalogueBackedSpellClient(
	options: CatalogueBackedSpellClientOptions = {},
): DndApiSpellClient {
	const catalogueService = options.catalogueService ?? createCatalogueSpellService();
	const fallbackClient = options.fallbackClient ?? createCharacterRemoteSpellAdapter();

	return {
		async searchSpells(input) {
			return withSpellClientError(async () => {
				if (!(await catalogueService.hasSeededSpells())) {
					return fallbackClient.searchSpells(input);
				}

				const spells = (await catalogueService.searchSpells(input)).map(toDndSpellSearchResult);
				return spells.length > 0 ? spells : fallbackClient.searchSpells(input);
			});
		},

		async findSpell(spellIndex, source = "spell") {
			return withSpellClientError(async () => {
				if (source === "feature") {
					return fallbackClient.findSpell(spellIndex, source);
				}

				const spell = await catalogueService.getSpellDetails(spellIndex);
				return spell ? toDndSpellSearchResult(spell) : fallbackClient.findSpell(spellIndex, source);
			});
		},

		async getSpellDetails(spellIndex, source = "spell") {
			return withSpellClientError(async () => {
				if (source === "feature") {
					return fallbackClient.getSpellDetails(spellIndex, source);
				}

				const spell = await catalogueService.getSpellDetails(spellIndex);
				return spell
					? toDndSpellDetails(spell)
					: fallbackClient.getSpellDetails(spellIndex, source);
			});
		},
	};
}

function createCharacterRemoteSpellAdapter(): DndApiSpellClient {
	const client = createCatalogueRemoteSpellClient();
	return {
		searchSpells: (input) =>
			client.searchSpells(input).then((results) => results.map(toDndRemoteSpellSearchResult)),
		findSpell: (index, source) =>
			client.findSpell(index, source).then(toDndRemoteSpellSearchResult),
		getSpellDetails: (index, source) =>
			client.getSpellDetails(index, source).then(toDndRemoteSpellDetails),
	};
}

async function withSpellClientError<T>(operation: () => Promise<T>) {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof DndApiSpellClientError) throw error;
		if (error instanceof CatalogueRemoteSpellClientError) throw new DndApiSpellClientError();
		throw new DndApiSpellClientError();
	}
}

function toDndSpellSearchResult(spell: CatalogueSpellSearchResult): DndSpellSearchResult {
	return DndSpellSearchResultSchema.parse({
		index: spell.spellIndex,
		name: spell.name,
		level: spell.level,
		url: spell.url,
		source: "spell",
	});
}

function toDndRemoteSpellSearchResult(
	spell: Awaited<
		ReturnType<ReturnType<typeof createCatalogueRemoteSpellClient>["searchSpells"]>
	>[number],
): DndSpellSearchResult {
	return DndSpellSearchResultSchema.parse(spell);
}

function toDndRemoteSpellDetails(
	spell: Awaited<
		ReturnType<ReturnType<typeof createCatalogueRemoteSpellClient>["getSpellDetails"]>
	>,
): DndSpellDetails {
	return DndSpellDetailsSchema.parse(spell);
}

function toDndSpellDetails(spell: CatalogueSpellDetails): DndSpellDetails {
	return DndSpellDetailsSchema.parse({
		index: spell.spellIndex,
		name: spell.name,
		level: spell.level,
		url: spell.url,
		source: "spell",
		desc: spell.desc,
		higherLevel: spell.higherLevel,
		metadata: spell.metadata,
	});
}
