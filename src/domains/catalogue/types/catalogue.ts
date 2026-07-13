import { z } from "zod";

export const CatalogueSourceSchema = z.enum(["foundry-dnd5e", "open5e", "dnd5eapi-legacy"]);
export type CatalogueSource = z.infer<typeof CatalogueSourceSchema>;

export const RulesVersionSchema = z.enum(["2014", "2024"]);
export type RulesVersion = z.infer<typeof RulesVersionSchema>;

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
});
export type CatalogueSpellSeed = z.infer<typeof CatalogueSpellSeedSchema>;

export const CatalogueSpellSearchResultSchema = CatalogueSpellSeedSchema.pick({
	spellIndex: true,
	name: true,
	level: true,
	url: true,
});
export type CatalogueSpellSearchResult = z.infer<typeof CatalogueSpellSearchResultSchema>;

export const CatalogueSpellDetailsSchema = CatalogueSpellSeedSchema;
export type CatalogueSpellDetails = z.infer<typeof CatalogueSpellDetailsSchema>;
