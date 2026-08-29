import { z } from "zod";
import {
	CatalogueSourceProvenanceSchema,
	CatalogueSourceSchema,
	RulesVersionSchema,
} from "./provenance.js";

export const CatalogueSpellIndexSchema = z
	.string()
	.min(1)
	.max(120)
	.regex(/^[a-z0-9-]+$/);
export type CatalogueSpellIndex = z.infer<typeof CatalogueSpellIndexSchema>;

export const CatalogueSpellNameSchema = z.string().min(1).max(120).regex(/\S/);
export const CatalogueSpellLevelSchema = z.number().int().min(0).max(9);
export const CatalogueSpellUrlSchema = z
	.string()
	.min(1)
	.max(240)
	.regex(/^\/api\/(?:2014|2024)\/spells\/[a-z0-9-]+$/);
export const CatalogueSpellDetailTextSchema = z.string().min(1).max(4_000);
export const CatalogueSpellMetadataItemSchema = z.object({
	label: z.string().min(1).max(60),
	value: z.string().min(1).max(500),
});

export const CatalogueSpellSeedSchema = z.object({
	source: CatalogueSourceSchema,
	sourceKey: z.string().min(1).max(240),
	sourcePath: z.string().min(1).max(500),
	rulesVersion: RulesVersionSchema,
	license: z.string().max(120),
	spellIndex: CatalogueSpellIndexSchema,
	name: CatalogueSpellNameSchema,
	level: CatalogueSpellLevelSchema,
	url: CatalogueSpellUrlSchema,
	desc: z.array(CatalogueSpellDetailTextSchema).min(1).max(20),
	higherLevel: z.array(CatalogueSpellDetailTextSchema).max(10),
	metadata: z.array(CatalogueSpellMetadataItemSchema).max(20),
	sourcePayload: z.unknown(),
	sourceRevision: z
		.string()
		.regex(/^[0-9a-f]{40}$/)
		.optional(),
	capability: z.literal("spells").optional(),
	pack: z.literal("spells24").optional(),
	sourceUrl: z.string().url().max(1_000).optional(),
});
export type CatalogueSpellSeed = z.infer<typeof CatalogueSpellSeedSchema>;

export const CatalogueSpellProvenanceSchema = CatalogueSourceProvenanceSchema.extend({
	capability: z.literal("spells"),
	pack: z.literal("spells24"),
});

export const CatalogueSpellSearchResultSchema = CatalogueSpellSeedSchema.pick({
	spellIndex: true,
	name: true,
	level: true,
	url: true,
});
export type CatalogueSpellSearchResult = z.infer<typeof CatalogueSpellSearchResultSchema>;

export const CatalogueSpellDetailsSchema = CatalogueSpellSeedSchema;
export type CatalogueSpellDetails = z.infer<typeof CatalogueSpellDetailsSchema>;
