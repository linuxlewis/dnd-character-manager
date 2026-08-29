import { z } from "zod";
import {
	CatalogueCapabilitySchema,
	CataloguePackSchema,
	ImmutableSourceRevisionSchema,
	RulesVersionSchema,
} from "./provenance.js";

export const CatalogueManifestPackSchema = z.object({
	pack: CataloguePackSchema,
	capability: CatalogueCapabilitySchema,
	pathPrefix: z.string().regex(/^packs\/_source\/[a-z0-9]+\/$/),
});
export type CatalogueManifestPack = z.infer<typeof CatalogueManifestPackSchema>;
export const CatalogueSourceManifestSchema = z.object({
	source: z.literal("foundry-dnd5e"),
	sourceUrl: z.string().url(),
	attribution: z.string().min(1).max(240),
	repositoryLicense: z.literal("MIT"),
	sourceRevision: ImmutableSourceRevisionSchema,
	rulesVersion: RulesVersionSchema,
	packs: z.array(CatalogueManifestPackSchema).min(1),
});
export type CatalogueSourceManifest = z.infer<typeof CatalogueSourceManifestSchema>;
