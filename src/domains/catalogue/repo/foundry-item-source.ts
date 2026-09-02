import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { FOUNDRY_DND5E_SOURCE, foundryDnd5eSourceUrl } from "../config/index.js";
import { CATALOGUE_SOURCE_MANIFEST } from "../config/manifest.js";
import type { CatalogueItemKind, CatalogueItemSeed } from "../types/index.js";
import {
	CatalogueItemRaritySchema,
	CatalogueItemSeedSchema,
	RulesVersionSchema,
} from "../types/index.js";

const FoundryItemSourceSchema = z
	.object({
		_id: z.string().optional(),
		name: z.string(),
		type: z.string().optional(),
		img: z.string().optional(),
		system: z
			.object({
				description: z.object({ value: z.string().optional().default("") }).passthrough(),
				source: z.object({ rules: z.string(), license: z.string().optional() }).passthrough(),
				price: z
					.object({
						value: z.union([z.number(), z.string()]).optional(),
						denomination: z.string().optional(),
					})
					.passthrough()
					.optional(),
				weight: z
					.object({ value: z.union([z.number(), z.string()]).optional() })
					.passthrough()
					.optional(),
				rarity: z.string().nullable().optional(),
				attunement: z.union([z.string(), z.boolean()]).nullable().optional(),
				properties: z.array(z.string()).optional().default([]),
				type: z
					.object({
						value: z.string().nullable().optional(),
						baseItem: z.string().nullable().optional(),
					})
					.passthrough()
					.optional(),
				armor: z.record(z.string(), z.json()).optional(),
				damage: z.record(z.string(), z.json()).optional(),
				strength: z.union([z.number(), z.string()]).nullable().optional(),
				identifier: z.string(),
			})
			.passthrough(),
	})
	.passthrough();

export interface FoundryItemSourceInput {
	path: string;
	yaml: string;
}

export function parseFoundryItemSource(input: FoundryItemSourceInput): CatalogueItemSeed {
	const sourcePayload = FoundryItemSourceSchema.parse(parseYaml(input.yaml));
	const relativePath = input.path.replace("packs/_source/equipment24/", "");
	const baseKind = itemKindForPath(relativePath, sourcePayload.type);
	const isMagical = isMagicalItem(
		relativePath,
		sourcePayload.system.rarity,
		sourcePayload.system.properties,
	);
	const kind = normalizeKind(baseKind, isMagical);
	const rarity = normalizeRarity(sourcePayload.system.rarity);
	const sourceKey = sourcePayload._id ?? sourcePayload.system.identifier;

	return CatalogueItemSeedSchema.parse({
		source: FOUNDRY_DND5E_SOURCE,
		sourceKey,
		sourcePath: input.path,
		rulesVersion: RulesVersionSchema.parse(sourcePayload.system.source.rules),
		license: sourcePayload.system.source.license ?? "",
		sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
		sourceUrl: foundryDnd5eSourceUrl(input.path),
		capability: "equipment",
		pack: "equipment24",
		seedMetadata: {
			capability: "equipment",
			pack: "equipment24",
			sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
			sourcePath: input.path,
		},
		identifier: sourcePayload.system.identifier,
		name: sourcePayload.name,
		kind,
		category: categoryForPath(relativePath),
		description: htmlToText(sourcePayload.system.description.value),
		isMagical,
		rarity,
		requiresAttunement:
			sourcePayload.system.attunement === true || sourcePayload.system.attunement === "required",
		costValue: numberOrNull(sourcePayload.system.price?.value),
		costDenomination: sourcePayload.system.price?.denomination ?? null,
		weight: numberOrNull(sourcePayload.system.weight?.value),
		thumbnailUrl: sourcePayload.img ?? null,
		properties: sourcePayload.system.properties,
		stats: normalizedStats(sourcePayload),
		sourcePayload,
	});
}

function itemKindForPath(path: string, sourceType: string | undefined): CatalogueItemKind {
	if (path.startsWith("weapons/")) return "weapon";
	if (path.startsWith("armor/")) return "armor";
	if (path.startsWith("adventuring-gear/")) {
		return sourceType === "container" || path.endsWith("/_container.yml")
			? "container"
			: "adventuring-gear";
	}
	if (path.startsWith("consumables/potions/")) return "potion";
	if (path.startsWith("consumables/scrolls/")) return "scroll";
	if (path.startsWith("consumables/")) return "consumable";
	if (path.startsWith("tools/")) return "tool";
	return "other";
}

function normalizeKind(kind: CatalogueItemKind, isMagical: boolean): CatalogueItemKind {
	return isMagical && !["potion", "scroll"].includes(kind) ? "magic-item" : kind;
}

function categoryForPath(path: string) {
	if (path.startsWith("adventuring-gear/")) return "Adventuring Gear";
	if (path.startsWith("consumables/potions/")) return "Potions";
	if (path.startsWith("consumables/scrolls/")) return "Scrolls";
	if (path.startsWith("consumables/")) return "Consumables";
	if (path.startsWith("weapons/")) return "Weapons";
	if (path.startsWith("armor/")) return "Armor";
	if (path.startsWith("tools/")) return "Tools";
	return "Other";
}

function isMagicalItem(path: string, rarity: string | null | undefined, properties: string[]) {
	return Boolean(rarity?.trim()) || properties.includes("mgc") || path.includes("/magical/");
}

function normalizeRarity(value: string | null | undefined) {
	const normalized = value?.trim();
	if (!normalized) return null;
	const rarity = normalized.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
	return CatalogueItemRaritySchema.parse(rarity);
}

function numberOrNull(value: number | string | undefined) {
	if (value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizedStats(source: z.infer<typeof FoundryItemSourceSchema>) {
	return {
		baseItem: source.system.type?.baseItem ?? null,
		itemType: source.system.type?.value ?? null,
		armor: source.system.armor ?? null,
		damage: source.system.damage ?? null,
		strength: numberOrNull(source.system.strength ?? undefined),
	};
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
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&nbsp;/g, " ");
}
