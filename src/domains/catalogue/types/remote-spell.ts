import { z } from "zod";

export const CatalogueRemoteSpellSourceSchema = z.enum(["spell", "feature"]);
export type CatalogueRemoteSpellSource = z.infer<typeof CatalogueRemoteSpellSourceSchema>;

export const CatalogueRemoteSpellSearchResultSchema = z.object({
	index: z.string().min(1).max(120),
	name: z.string().min(1).max(120),
	level: z.number().int().min(0).max(20),
	url: z.string().min(1).max(240),
	source: CatalogueRemoteSpellSourceSchema,
});
export type CatalogueRemoteSpellSearchResult = z.infer<
	typeof CatalogueRemoteSpellSearchResultSchema
>;

export const CatalogueRemoteSpellDetailsSchema = CatalogueRemoteSpellSearchResultSchema.extend({
	desc: z.array(z.string().min(1).max(4_000)).min(1).max(20),
	higherLevel: z.array(z.string().min(1).max(4_000)).max(10),
	metadata: z.array(z.object({ label: z.string(), value: z.string() })).max(12),
});
export type CatalogueRemoteSpellDetails = z.infer<typeof CatalogueRemoteSpellDetailsSchema>;

export interface CatalogueRemoteSpellCapability {
	searchSpells(input: {
		slotLevel: number;
		query: string;
	}): Promise<CatalogueRemoteSpellSearchResult[]>;
	findSpell(
		index: string,
		source?: CatalogueRemoteSpellSource,
	): Promise<CatalogueRemoteSpellSearchResult>;
	getSpellDetails(
		index: string,
		source?: CatalogueRemoteSpellSource,
	): Promise<CatalogueRemoteSpellDetails>;
}
