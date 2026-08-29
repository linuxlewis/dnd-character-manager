import { z } from "zod";
import type { CatalogueDetailPort, CatalogueSearchPort } from "./capabilities.js";

export const CatalogueRemoteSpellSourceSchema = z.enum(["spell", "feature"]);
export type CatalogueRemoteSpellSource = z.infer<typeof CatalogueRemoteSpellSourceSchema>;
export const CatalogueRemoteSpellIndexSchema = z
	.string()
	.min(1)
	.max(120)
	.regex(/^[a-z0-9-]+$/);
export const CatalogueRemoteSpellSearchInputSchema = z.object({
	slotLevel: z.number().int().min(0).max(9),
	query: z.string().max(120),
});
export const CatalogueRemoteSpellQuerySchema = z.string().max(120);

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

export type CatalogueRemoteSpellSearchPort = CatalogueSearchPort<
	{ slotLevel: number; query: string },
	CatalogueRemoteSpellSearchResult
>;
export type CatalogueRemoteSpellDetailPort = CatalogueDetailPort<
	string,
	CatalogueRemoteSpellDetails
>;
