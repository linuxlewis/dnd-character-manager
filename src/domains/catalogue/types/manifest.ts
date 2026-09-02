import { z } from "zod";
import { ImmutableSourceRevisionSchema, RulesVersionSchema } from "./provenance.js";

export const CatalogueManifestPackSchema = z
	.object({
		capability: z.enum(["spells", "equipment"]),
		pack: z.enum(["spells24", "equipment24"]),
		pathPrefix: z.string().regex(/^packs\/_source\/[a-z0-9]+\/$/),
	})
	.superRefine((value, context) => {
		if (value.capability === "spells" && value.pack !== "spells24") {
			context.addIssue({ code: "custom", message: "spells capability requires spells24 pack" });
		}
		if (value.capability === "equipment" && value.pack !== "equipment24") {
			context.addIssue({
				code: "custom",
				message: "equipment capability requires equipment24 pack",
			});
		}
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
