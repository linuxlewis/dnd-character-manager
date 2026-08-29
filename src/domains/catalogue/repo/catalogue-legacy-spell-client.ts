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

const DndApiFeatureDetailResponseSchema = z.object({
	index: z.string(),
	name: z.string(),
	level: z.number().int(),
	url: z.string(),
	desc: z.array(z.string()).min(1),
	class: DndApiReferenceSchema.optional(),
	subclass: DndApiReferenceSchema.optional(),
});

const DndApiFeatureSearchResponseSchema = z.object({
	results: z.array(
		z.object({
			index: z.string(),
			name: z.string(),
		}),
	),
});

export async function searchLegacyFeatures(
	legacyBaseUrl: string,
	fetcher: typeof fetch,
	query: string,
): Promise<CatalogueRemoteSpellSearchResult[]> {
	const response = await fetcher(
		`${legacyBaseUrl}/api/2014/features?name=${encodeURIComponent(query)}`,
	);
	if (!response.ok) throw new Error("Legacy D&D feature search request failed.");

	const parsed = DndApiFeatureSearchResponseSchema.parse(await response.json());
	const details = await Promise.all(
		parsed.results
			.filter((feature) => matchesName(feature.name, query))
			.map((feature) => getLegacySpellDetails(legacyBaseUrl, fetcher, feature.index, "feature")),
	);

	return details.map((feature) =>
		CatalogueRemoteSpellSearchResultSchema.parse({
			index: feature.index,
			name: feature.name,
			level: feature.level,
			url: feature.url,
			source: "feature",
		}),
	);
}

export async function getLegacySpellDetails(
	legacyBaseUrl: string,
	fetcher: typeof fetch,
	spellIndex: string,
	source: CatalogueRemoteSpellSource,
): Promise<CatalogueRemoteSpellDetails> {
	const index = spellIndex;
	const resource = source === "feature" ? "features" : "spells";
	const response = await fetcher(`${legacyBaseUrl}/api/2014/${resource}/${index}`);
	if (!response.ok) throw new Error("Legacy D&D spell detail request failed.");
	const schema =
		source === "feature" ? DndApiFeatureDetailResponseSchema : DndApiSpellDetailResponseSchema;
	return parseLegacySpellDetails(schema.parse(await response.json()), source);
}

function parseLegacySpellDetails(
	entry:
		| z.infer<typeof DndApiFeatureDetailResponseSchema>
		| z.infer<typeof DndApiSpellDetailResponseSchema>,
	source: CatalogueRemoteSpellSource,
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

	return CatalogueRemoteSpellDetailsSchema.parse({
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
