import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { FOUNDRY_DND5E_RULES_VERSION, FOUNDRY_DND5E_SOURCE } from "../config/index.js";
import type { CatalogueSpellSeed } from "../types/index.js";
import {
	CatalogueSpellIndexSchema,
	CatalogueSpellSeedSchema,
	RulesVersionSchema,
} from "../types/index.js";

const FoundrySpellSourceSchema = z
	.object({
		_id: z.string().optional(),
		name: z.string(),
		type: z.string().optional(),
		system: z
			.object({
				description: z
					.object({
						value: z.string(),
					})
					.passthrough(),
				source: z
					.object({
						rules: z.string(),
						license: z.string().optional(),
					})
					.passthrough(),
				activation: z
					.object({
						type: z.string().optional(),
					})
					.passthrough()
					.optional(),
				duration: z
					.object({
						value: z.union([z.string(), z.number()]).optional(),
						units: z.string().optional(),
					})
					.passthrough()
					.optional(),
				range: z
					.object({
						value: z.union([z.string(), z.number()]).optional(),
						units: z.string().optional(),
						special: z.string().optional(),
					})
					.passthrough()
					.optional(),
				level: z.number().int(),
				school: z.string().optional(),
				properties: z.array(z.string()).optional().default([]),
				materials: z
					.object({
						value: z.string().optional(),
					})
					.passthrough()
					.optional(),
				identifier: z.string(),
			})
			.passthrough(),
	})
	.passthrough();

export interface FoundrySpellSourceInput {
	path: string;
	yaml: string;
}

export function parseFoundrySpellSource(input: FoundrySpellSourceInput): CatalogueSpellSeed {
	const sourcePayload = FoundrySpellSourceSchema.parse(parseYaml(input.yaml));
	const spellIndex = CatalogueSpellIndexSchema.parse(sourcePayload.system.identifier);
	const paragraphs = htmlParagraphs(sourcePayload.system.description.value);
	const higherLevel = extractHigherLevel(paragraphs);

	return CatalogueSpellSeedSchema.parse({
		source: FOUNDRY_DND5E_SOURCE,
		sourceKey: sourcePayload._id ?? spellIndex,
		sourcePath: input.path,
		rulesVersion: RulesVersionSchema.parse(sourcePayload.system.source.rules),
		license: sourcePayload.system.source.license ?? "",
		spellIndex,
		name: sourcePayload.name,
		level: sourcePayload.system.level,
		url: `/api/${FOUNDRY_DND5E_RULES_VERSION}/spells/${spellIndex}`,
		desc: paragraphs.filter((paragraph) => !isHigherLevelParagraph(paragraph)),
		higherLevel: higherLevel ? [higherLevel] : [],
		metadata: foundrySpellMetadata(sourcePayload),
		sourcePayload,
	});
}

function foundrySpellMetadata(source: z.infer<typeof FoundrySpellSourceSchema>) {
	return [
		metadata("Casting Time", formatCastingTime(source.system.activation?.type)),
		metadata("Range", formatRange(source.system.range)),
		metadata("Duration", formatDuration(source.system.duration, source.system.properties)),
		metadata(
			"Components",
			formatComponents(source.system.properties, source.system.materials?.value),
		),
		metadata("School", formatSchool(source.system.school)),
	].filter((item) => item !== null);
}

function htmlParagraphs(value: string) {
	const matches = [...value.matchAll(/<p\b[^>]*>(.*?)<\/p>/gis)];
	const paragraphs = matches.length > 0 ? matches.map((match) => match[1] ?? "") : [value];
	return paragraphs.map(htmlToText).filter(Boolean);
}

function htmlToText(value: string) {
	return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
}

function decodeHtmlEntities(value: string) {
	return value
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function extractHigherLevel(paragraphs: string[]) {
	const paragraph = paragraphs.find(isHigherLevelParagraph);
	return paragraph?.replace(/^Using a Higher-Level Spell Slot\.\s*/i, "").trim() ?? "";
}

function isHigherLevelParagraph(paragraph: string) {
	return /^Using a Higher-Level Spell Slot\./i.test(paragraph);
}

function metadata(label: string, value: string | undefined) {
	const normalized = value?.trim();
	return normalized ? { label, value: normalized } : null;
}

function formatCastingTime(value: string | undefined) {
	if (value === "bonus") return "Bonus Action";
	return formatTitle(value);
}

function formatRange(
	range: { value?: string | number; units?: string; special?: string } | undefined,
) {
	if (!range) return undefined;
	if (range.special?.trim()) return range.special.trim();
	if (range.units === "self") return "Self";
	if (range.units === "touch") return "Touch";
	if (range.units === "ft") return `${range.value} feet`;
	return formatUnitValue(range.value, range.units);
}

function formatDuration(
	duration: { value?: string | number; units?: string } | undefined,
	properties: string[],
) {
	if (!duration) return undefined;
	const formatted =
		duration.units === "inst" ? "Instantaneous" : formatUnitValue(duration.value, duration.units);
	if (!formatted) return undefined;
	return properties.includes("concentration") && formatted !== "Instantaneous"
		? `Concentration, up to ${formatted}`
		: formatted;
}

function formatComponents(properties: string[], material?: string) {
	const components: string[] = [];
	if (properties.includes("vocal")) components.push("V");
	if (properties.includes("somatic")) components.push("S");
	if (properties.includes("material")) components.push("M");
	if (components.length === 0) return undefined;
	const componentText = components.join(", ");
	return material?.trim() ? `${componentText} (${material.trim()})` : componentText;
}

function formatSchool(value: string | undefined) {
	const schools: Record<string, string> = {
		abj: "Abjuration",
		con: "Conjuration",
		div: "Divination",
		enc: "Enchantment",
		evo: "Evocation",
		ill: "Illusion",
		nec: "Necromancy",
		trs: "Transmutation",
	};
	return value ? (schools[value] ?? formatTitle(value)) : undefined;
}

function formatUnitValue(value: string | number | undefined, unit: string | undefined) {
	if (!unit) return undefined;
	const normalizedValue = value === undefined || value === "" ? "" : String(value);
	const unitText = unit === "ft" ? "feet" : unit;
	const pluralizedUnit = normalizedValue === "1" ? unitText : pluralize(unitText);
	return normalizedValue ? `${normalizedValue} ${pluralizedUnit}` : formatTitle(unitText);
}

function pluralize(value: string) {
	return value.endsWith("s") ? value : `${value}s`;
}

function formatTitle(value: string | undefined) {
	return value
		?.split(/[-_\s]+/)
		.filter(Boolean)
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(" ");
}
