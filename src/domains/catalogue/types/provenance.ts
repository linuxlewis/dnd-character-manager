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

export const CatalogueSeedCapabilityPackSchema = z.discriminatedUnion("capability", [
	z.object({ capability: z.literal("spells"), pack: z.literal("spells24") }),
	z.object({ capability: z.literal("equipment"), pack: z.literal("equipment24") }),
]);

export const CatalogueSeedProvenanceFieldsSchema = z.object({
	source: z.literal("foundry-dnd5e"),
	sourceKey: z.string().min(1).max(240),
	sourcePath: z.string().min(1).max(500),
	rulesVersion: RulesVersionSchema,
	license: z.string().max(120),
	sourcePayload: z.unknown(),
	sourceRevision: ImmutableSourceRevisionSchema,
	sourceUrl: z.string().url().max(1_000),
});

export const CatalogueSeedProvenanceSchema = CatalogueSeedProvenanceFieldsSchema.and(
	CatalogueSeedCapabilityPackSchema,
).superRefine((value, context) => {
	if (!value.sourceUrl.startsWith("https://raw.githubusercontent.com/foundryvtt/dnd5e/")) {
		context.addIssue({
			code: "custom",
			path: ["sourceUrl"],
			message: "Foundry seed sourceUrl must point to the dnd5e repository",
		});
	}
	if (!value.sourceUrl.includes(`/${value.sourceRevision}/`)) {
		context.addIssue({
			code: "custom",
			path: ["sourceUrl"],
			message: "Foundry seed sourceUrl must identify the immutable source revision",
		});
	}
});
export type CatalogueSeedProvenance = z.infer<typeof CatalogueSeedProvenanceSchema>;
export type CatalogueSeedCapabilityPack = z.infer<typeof CatalogueSeedCapabilityPackSchema>;
export type CatalogueSeedProvenanceFields = z.infer<typeof CatalogueSeedProvenanceFieldsSchema>;
