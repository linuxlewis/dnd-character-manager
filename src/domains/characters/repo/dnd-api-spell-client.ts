import { z } from "zod";
import type { DndSpellDetails, DndSpellSearchResult, SpellEntrySource } from "../types/index.js";
import {
	DndSpellDetailsSchema,
	DndSpellSearchResultSchema,
	SpellIndexSchema,
} from "../types/index.js";

const DND_API_REST_BASE_URL = "https://www.dnd5eapi.co";

const DndApiSpellListResponseSchema = z.object({
	count: z.number().int().min(0),
	results: z.array(
		z.object({
			index: z.string(),
			name: z.string(),
			level: z.number().int(),
			url: z.string(),
		}),
	),
});

const DndApiReferenceSchema = z.object({
	name: z.string(),
});

const DndApiSpellDetailResponseSchema = z.object({
	index: z.string(),
	name: z.string(),
	level: z.number().int(),
	url: z.string(),
	desc: z.array(z.string()).min(1),
	higher_level: z.array(z.string()).optional().default([]),
	casting_time: z.string().optional(),
	range: z.string().optional(),
	duration: z.string().optional(),
	components: z.array(z.string()).optional().default([]),
	material: z.string().optional(),
	school: DndApiReferenceSchema.optional(),
	classes: z.array(DndApiReferenceSchema).optional().default([]),
});

const DndApiFeatureListResponseSchema = z.object({
	count: z.number().int().min(0),
	results: z.array(
		z.object({
			index: z.string(),
			name: z.string(),
			url: z.string(),
		}),
	),
});

const DndApiFeatureDetailResponseSchema = z.object({
	index: z.string(),
	name: z.string(),
	level: z.number().int(),
	url: z.string(),
	desc: z.array(z.string()).min(1),
	class: DndApiReferenceSchema.optional(),
	subclass: DndApiReferenceSchema.optional(),
});

export interface SearchSpellsInput {
	slotLevel: number;
	query: string;
}

export interface DndApiSpellClient {
	searchSpells(input: SearchSpellsInput): Promise<DndSpellSearchResult[]>;
	findSpell(spellIndex: string, source?: SpellEntrySource): Promise<DndSpellSearchResult>;
	getSpellDetails(spellIndex: string, source?: SpellEntrySource): Promise<DndSpellDetails>;
}

export interface DndApiSpellClientOptions {
	baseUrl?: string;
	fetcher?: typeof fetch;
}

export class DndApiSpellClientError extends Error {
	constructor() {
		super("D&D spells could not be loaded.");
		this.name = "DndApiSpellClientError";
	}
}

export function createDndApiSpellClient(options: DndApiSpellClientOptions = {}): DndApiSpellClient {
	const baseUrl = options.baseUrl ?? DND_API_REST_BASE_URL;
	const fetcher = options.fetcher ?? fetch;

	return {
		async searchSpells(input) {
			try {
				const query = input.query.trim().toLowerCase();
				const [spells, features] = await Promise.all([
					searchSpellEntries(baseUrl, fetcher, input.slotLevel, query),
					query.length >= 3 ? searchFeatureEntries(baseUrl, fetcher, query) : [],
				]);
				return [...spells, ...features].sort(compareSearchResults);
			} catch (error) {
				if (error instanceof DndApiSpellClientError) throw error;
				throw new DndApiSpellClientError();
			}
		},

		async findSpell(spellIndex, source = "spell") {
			try {
				return parseSearchResult(await fetchDetail(baseUrl, fetcher, spellIndex, source), source);
			} catch (error) {
				if (error instanceof DndApiSpellClientError) throw error;
				throw new DndApiSpellClientError();
			}
		},

		async getSpellDetails(spellIndex, source = "spell") {
			try {
				const detail = await fetchDetail(baseUrl, fetcher, spellIndex, source);
				return parseSpellDetails(detail, source);
			} catch (error) {
				if (error instanceof DndApiSpellClientError) throw error;
				throw new DndApiSpellClientError();
			}
		},
	};
}

async function searchSpellEntries(
	baseUrl: string,
	fetcher: typeof fetch,
	slotLevel: number,
	query: string,
) {
	const response = await fetcher(`${baseUrl}/api/2014/spells`);
	if (!response.ok) throw new DndApiSpellClientError();

	const parsed = DndApiSpellListResponseSchema.parse(await response.json());
	return parsed.results
		.filter((spell) => spell.level >= 1 && spell.level <= slotLevel)
		.filter((spell) => query.length === 0 || matchesName(spell.name, query))
		.map((spell) => parseSearchResult(spell, "spell"));
}

async function searchFeatureEntries(baseUrl: string, fetcher: typeof fetch, query: string) {
	const response = await fetcher(`${baseUrl}/api/2014/features`);
	if (!response.ok) throw new DndApiSpellClientError();

	const parsed = DndApiFeatureListResponseSchema.parse(await response.json());
	const matchingFeatures = parsed.results
		.filter((feature) => matchesName(feature.name, query))
		.slice(0, 20);
	const details = await Promise.all(
		matchingFeatures.map(async (feature) => {
			const detailResponse = await fetcher(`${baseUrl}${feature.url}`);
			if (!detailResponse.ok) throw new DndApiSpellClientError();
			return DndApiFeatureDetailResponseSchema.parse(await detailResponse.json());
		}),
	);
	return details.map((feature) => parseSearchResult(feature, "feature"));
}

function parseSearchResult(
	entry: { index: string; level: number; name: string; url: string },
	source: SpellEntrySource,
) {
	return DndSpellSearchResultSchema.parse({ ...entry, source });
}

async function fetchDetail(
	baseUrl: string,
	fetcher: typeof fetch,
	spellIndex: string,
	source: SpellEntrySource,
) {
	const index = SpellIndexSchema.parse(spellIndex);
	const resource = source === "feature" ? "features" : "spells";
	const response = await fetcher(`${baseUrl}/api/2014/${resource}/${index}`);
	if (!response.ok) throw new DndApiSpellClientError();
	const schema =
		source === "feature" ? DndApiFeatureDetailResponseSchema : DndApiSpellDetailResponseSchema;
	return schema.parse(await response.json());
}

function parseSpellDetails(
	entry:
		| z.infer<typeof DndApiFeatureDetailResponseSchema>
		| z.infer<typeof DndApiSpellDetailResponseSchema>,
	source: SpellEntrySource,
) {
	const details =
		source === "feature"
			? {
					higherLevel: [],
					metadata: featureMetadata(entry as z.infer<typeof DndApiFeatureDetailResponseSchema>),
				}
			: {
					higherLevel: (entry as z.infer<typeof DndApiSpellDetailResponseSchema>).higher_level,
					metadata: spellMetadata(entry as z.infer<typeof DndApiSpellDetailResponseSchema>),
				};

	return DndSpellDetailsSchema.parse({
		index: entry.index,
		name: entry.name,
		level: entry.level,
		url: entry.url,
		source,
		desc: entry.desc,
		...details,
	});
}

function spellMetadata(entry: z.infer<typeof DndApiSpellDetailResponseSchema>) {
	return [
		metadata("Casting Time", entry.casting_time),
		metadata("Range", entry.range),
		metadata("Duration", entry.duration),
		metadata("Components", formatComponents(entry.components, entry.material)),
		metadata("School", entry.school?.name),
		metadata("Classes", formatReferences(entry.classes)),
	].filter((item) => item !== null);
}

function featureMetadata(entry: z.infer<typeof DndApiFeatureDetailResponseSchema>) {
	return [
		metadata("Feature Level", String(entry.level)),
		metadata("Class", entry.class?.name),
		metadata("Subclass", entry.subclass?.name),
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

function matchesName(name: string, query: string) {
	return name.toLowerCase().includes(query);
}

function compareSearchResults(left: DndSpellSearchResult, right: DndSpellSearchResult) {
	return left.level - right.level || left.name.localeCompare(right.name);
}
