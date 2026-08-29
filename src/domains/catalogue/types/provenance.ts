import { z } from "zod";

export const CatalogueSourceSchema = z.enum(["foundry-dnd5e", "open5e", "dnd5eapi-legacy"]);
export type CatalogueSource = z.infer<typeof CatalogueSourceSchema>;

export const RulesVersionSchema = z.enum(["2014", "2024"]);
export type RulesVersion = z.infer<typeof RulesVersionSchema>;

export const CatalogueCapabilitySchema = z.enum(["spells", "equipment"]);
export type CatalogueCapability = z.infer<typeof CatalogueCapabilitySchema>;

export const CataloguePackSchema = z.enum(["spells24", "equipment24"]);
export type CataloguePack = z.infer<typeof CataloguePackSchema>;

export const SourceRevisionSchema = z
	.string()
	.min(1)
	.max(200)
	.regex(/^[A-Za-z0-9._:/-]+$/);
export type SourceRevision = z.infer<typeof SourceRevisionSchema>;

export const ImmutableSourceRevisionSchema = SourceRevisionSchema.regex(/^[0-9a-f]{40}$/);
export type ImmutableSourceRevision = z.infer<typeof ImmutableSourceRevisionSchema>;

export const CatalogueSeedProvenanceSchema = z.object({
	source: CatalogueSourceSchema,
	sourceKey: z.string().min(1).max(240),
	sourcePath: z.string().min(1).max(500),
	rulesVersion: RulesVersionSchema,
	license: z.string().max(120),
	sourcePayload: z.unknown(),
	sourceRevision: SourceRevisionSchema,
	capability: CatalogueCapabilitySchema,
	pack: CataloguePackSchema,
	sourceUrl: z.string().url().max(1_000),
});
export type CatalogueSeedProvenance = z.infer<typeof CatalogueSeedProvenanceSchema>;
