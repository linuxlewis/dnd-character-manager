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

function validateFoundrySeedSourceUrl(
	value: z.infer<typeof CatalogueSeedProvenanceFieldsSchema>,
	context: z.RefinementCtx,
) {
	if (!value.sourceUrl.startsWith("https://raw.githubusercontent.com/foundryvtt/dnd5e/")) {
		context.addIssue({
			code: "custom",
			path: ["sourceUrl"],
			message: "Foundry seed sourceUrl must point to the dnd5e repository",
		});
	}
	const expectedUrl = `https://raw.githubusercontent.com/foundryvtt/dnd5e/${value.sourceRevision}/${value.sourcePath}`;
	if (value.sourceUrl !== expectedUrl) {
		context.addIssue({
			code: "custom",
			path: ["sourceUrl"],
			message: "Foundry seed sourceUrl must identify the immutable source revision and path",
		});
	}
}

const CatalogueFoundrySpellSeedProvenanceFieldsSchema = CatalogueSeedProvenanceFieldsSchema.extend({
	capability: z.literal("spells"),
	pack: z.literal("spells24"),
});

const CatalogueFoundryEquipmentSeedProvenanceFieldsSchema =
	CatalogueSeedProvenanceFieldsSchema.extend({
		capability: z.literal("equipment"),
		pack: z.literal("equipment24"),
	});

export const CatalogueFoundrySpellSeedProvenanceSchema =
	CatalogueFoundrySpellSeedProvenanceFieldsSchema.superRefine(validateFoundrySeedSourceUrl);

export const CatalogueFoundrySeedProvenanceSchema = z
	.discriminatedUnion("capability", [
		CatalogueFoundrySpellSeedProvenanceFieldsSchema,
		CatalogueFoundryEquipmentSeedProvenanceFieldsSchema,
	])
	.superRefine(validateFoundrySeedSourceUrl);

export const CatalogueSeedProvenanceSchema = CatalogueFoundrySeedProvenanceSchema;
export type CatalogueSeedProvenance = z.infer<typeof CatalogueSeedProvenanceSchema>;
export type CatalogueSeedCapabilityPack = z.infer<typeof CatalogueSeedCapabilityPackSchema>;
export type CatalogueSeedProvenanceFields = z.infer<typeof CatalogueSeedProvenanceFieldsSchema>;
export type CatalogueFoundrySpellSeedProvenance = z.infer<
	typeof CatalogueFoundrySpellSeedProvenanceSchema
>;
export type CatalogueFoundrySeedProvenance = z.infer<typeof CatalogueFoundrySeedProvenanceSchema>;
