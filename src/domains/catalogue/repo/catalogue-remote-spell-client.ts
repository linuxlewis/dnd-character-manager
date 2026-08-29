import { z } from "zod";
import type {
	CatalogueRemoteSpellDetails,
	CatalogueRemoteSpellSearchResult,
	CatalogueRemoteSpellSource,
} from "../types/index.js";
import {
	CatalogueRemoteSpellDetailsSchema,
	CatalogueRemoteSpellSearchResultSchema,
} from "../types/index.js";
import { getLegacySpellDetails, searchLegacyFeatures } from "./catalogue-legacy-spell-client.js";

const OPEN5E_API_BASE_URL = "https://api.open5e.com/v2";
const DND_API_2014_REST_BASE_URL = "https://www.dnd5eapi.co";
const OPEN5E_SRD_2024_DOCUMENT_KEY = "srd-2024";
const OPEN5E_DETAIL_FIELDS =
	"key,name,level,desc,higher_level,casting_time,range_text,duration,verbal,somatic,material,material_specified,school,classes";

const DndApiReferenceSchema = z.object({
	name: z.string(),
});

const Open5eSearchResponseSchema = z.object({
	results: z.array(
		z.object({
			key: z.string(),
			name: z.string(),
			level: z.number().int(),
		}),
	),
});

const Open5eSpellDetailResponseSchema = z.object({
	key: z.string(),
	name: z.string(),
	level: z.number().int(),
	desc: z.union([z.string(), z.array(z.string()).min(1)]),
	higher_level: z
		.union([z.string(), z.array(z.string())])
		.optional()
		.default(""),
	casting_time: z.string().optional(),
	range_text: z.string().optional(),
	duration: z.string().optional(),
	verbal: z.boolean().optional().default(false),
	somatic: z.boolean().optional().default(false),
	material: z.boolean().optional().default(false),
	material_specified: z.string().optional(),
	school: DndApiReferenceSchema.optional(),
	classes: z.array(DndApiReferenceSchema).optional().default([]),
});

export interface SearchSpellsInput {
	slotLevel: number;
	query: string;
}

export interface CatalogueRemoteSpellClient {
	searchSpells(input: SearchSpellsInput): Promise<CatalogueRemoteSpellSearchResult[]>;
	findSpell(
		spellIndex: string,
		source?: CatalogueRemoteSpellSource,
	): Promise<CatalogueRemoteSpellSearchResult>;
	getSpellDetails(
		spellIndex: string,
		source?: CatalogueRemoteSpellSource,
	): Promise<CatalogueRemoteSpellDetails>;
}

export interface CatalogueRemoteSpellClientOptions {
	open5eBaseUrl?: string;
	legacyBaseUrl?: string;
	fetcher?: typeof fetch;
}

export class CatalogueRemoteSpellClientError extends Error {
	constructor() {
		super("D&D spells could not be loaded.");
		this.name = "CatalogueRemoteSpellClientError";
	}
}

export function createCatalogueRemoteSpellClient(
	options: CatalogueRemoteSpellClientOptions = {},
): CatalogueRemoteSpellClient {
	const open5eBaseUrl = trimTrailingSlash(options.open5eBaseUrl ?? OPEN5E_API_BASE_URL);
	const legacyBaseUrl = trimTrailingSlash(options.legacyBaseUrl ?? DND_API_2014_REST_BASE_URL);
	const fetcher = options.fetcher ?? fetch;

	return {
		async searchSpells(input) {
			try {
				const query = input.query.trim().toLowerCase();
				if (query.length === 0) return [];
				return (
					await searchEntries(open5eBaseUrl, legacyBaseUrl, fetcher, input.slotLevel, query)
				).sort(compareSearchResults);
			} catch (error) {
				if (error instanceof CatalogueRemoteSpellClientError) throw error;
				throw new CatalogueRemoteSpellClientError();
			}
		},

		async findSpell(spellIndex, source = "spell") {
			try {
				const details = await getDetails(open5eBaseUrl, legacyBaseUrl, fetcher, spellIndex, source);
				return CatalogueRemoteSpellSearchResultSchema.parse({
					index: details.index,
					name: details.name,
					level: details.level,
					url: details.url,
					source: details.source,
				});
			} catch (error) {
				if (error instanceof CatalogueRemoteSpellClientError) throw error;
				throw new CatalogueRemoteSpellClientError();
			}
		},

		async getSpellDetails(spellIndex, source = "spell") {
			try {
				return getDetails(open5eBaseUrl, legacyBaseUrl, fetcher, spellIndex, source);
			} catch (error) {
				if (error instanceof CatalogueRemoteSpellClientError) throw error;
				throw new CatalogueRemoteSpellClientError();
			}
		},
	};
}

async function searchEntries(
	open5eBaseUrl: string,
	legacyBaseUrl: string,
	fetcher: typeof fetch,
	slotLevel: number,
	query: string,
) {
	const spells = await searchOpen5eSpells(open5eBaseUrl, fetcher, slotLevel, query);
	if (slotLevel !== 0) return spells;

	const features = await searchLegacyFeatures(legacyBaseUrl, fetcher, query);
	return [...spells, ...features];
}

async function searchOpen5eSpells(
	open5eBaseUrl: string,
	fetcher: typeof fetch,
	slotLevel: number,
	query: string,
) {
	const response = await fetcher(searchUrl(open5eBaseUrl, slotLevel, query));
	if (!response.ok) throw new CatalogueRemoteSpellClientError();

	const parsed = Open5eSearchResponseSchema.parse(await response.json());
	return parsed.results
		.filter((spell) => isSpellInBucket(spell.level, slotLevel))
		.filter((spell) => matchesName(spell.name, query))
		.map(parseOpen5eSearchResult);
}

function parseOpen5eSearchResult(entry: { key: string; level: number; name: string }) {
	const index = spellIndexFromOpen5eKey(entry.key);
	return CatalogueRemoteSpellSearchResultSchema.parse({
		index,
		name: entry.name,
		level: entry.level,
		url: spellApiUrl(index, "spell", "2024"),
		source: "spell",
	});
}

function isSpellInBucket(spellLevel: number, slotLevel: number) {
	if (slotLevel === 0) return spellLevel === 0;
	return spellLevel >= 1 && spellLevel <= slotLevel;
}

function spellApiUrl(index: string, source: CatalogueRemoteSpellSource, version: "2014" | "2024") {
	const resource = source === "feature" ? "features" : "spells";
	return `/api/${version}/${resource}/${index}`;
}

async function fetchOpen5eDetail(open5eBaseUrl: string, fetcher: typeof fetch, spellIndex: string) {
	const index = spellIndex;
	const response = await fetcher(
		`${open5eBaseUrl}/spells/${open5eSpellKey(index)}/?fields=${OPEN5E_DETAIL_FIELDS}`,
	);
	if (!response.ok) throw new CatalogueRemoteSpellClientError();
	return Open5eSpellDetailResponseSchema.parse(await response.json());
}

async function getDetails(
	open5eBaseUrl: string,
	legacyBaseUrl: string,
	fetcher: typeof fetch,
	spellIndex: string,
	source: CatalogueRemoteSpellSource,
) {
	if (source === "feature") {
		return getLegacySpellDetails(legacyBaseUrl, fetcher, spellIndex, source);
	}

	try {
		return parseOpen5eSpellDetails(await fetchOpen5eDetail(open5eBaseUrl, fetcher, spellIndex));
	} catch {
		return getLegacySpellDetails(legacyBaseUrl, fetcher, spellIndex, source);
	}
}

function parseOpen5eSpellDetails(entry: z.infer<typeof Open5eSpellDetailResponseSchema>) {
	const index = spellIndexFromOpen5eKey(entry.key);
	return CatalogueRemoteSpellDetailsSchema.parse({
		index,
		name: entry.name,
		level: entry.level,
		url: spellApiUrl(index, "spell", "2024"),
		source: "spell",
		desc: textArray(entry.desc),
		higherLevel: textArray(entry.higher_level),
		metadata: open5eSpellMetadata(entry),
	});
}

function open5eSpellMetadata(entry: z.infer<typeof Open5eSpellDetailResponseSchema>) {
	return [
		metadata("Casting Time", entry.casting_time),
		metadata("Range", entry.range_text),
		metadata("Duration", entry.duration),
		metadata("Components", formatOpen5eComponents(entry)),
		metadata("School", entry.school?.name),
		metadata("Classes", formatReferences(entry.classes)),
	].filter((item) => item !== null);
}

function metadata(label: string, value: string | undefined) {
	const normalized = value?.trim();
	return normalized ? { label, value: normalized } : null;
}

function formatReferences(references: Array<{ name: string }>) {
	return references.map((reference) => reference.name).join(", ");
}

function formatComponents(components: string[], material?: string) {
	if (components.length === 0) return "";
	const componentText = components.join(", ");
	return material ? `${componentText} (${material})` : componentText;
}

function formatOpen5eComponents(entry: z.infer<typeof Open5eSpellDetailResponseSchema>) {
	const components: string[] = [];
	if (entry.verbal) components.push("V");
	if (entry.somatic) components.push("S");
	if (entry.material) components.push("M");
	return formatComponents(components, entry.material_specified);
}

function matchesName(name: string, query: string) {
	return name.toLowerCase().includes(query);
}

function compareSearchResults(
	left: CatalogueRemoteSpellSearchResult,
	right: CatalogueRemoteSpellSearchResult,
) {
	return left.level - right.level || left.name.localeCompare(right.name);
}

function searchUrl(open5eBaseUrl: string, slotLevel: number, query: string) {
	return `${open5eBaseUrl}/spells/?name__icontains=${encodeURIComponent(query)}&document__key__in=${OPEN5E_SRD_2024_DOCUMENT_KEY}&level__lte=${slotLevel}&fields=key,name,level`;
}

function open5eSpellKey(index: string) {
	return `${OPEN5E_SRD_2024_DOCUMENT_KEY}_${index}`;
}

function spellIndexFromOpen5eKey(key: string) {
	const prefix = `${OPEN5E_SRD_2024_DOCUMENT_KEY}_`;
	return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

function textArray(value: string | string[]) {
	if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
	return value
		.split(/\r?\n\r?\n/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function trimTrailingSlash(value: string) {
	return value.replace(/\/+$/, "");
}
