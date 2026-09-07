import { z } from "zod";

export const CATALOGUE_JOURNEY_FIXTURE_ENV = "CATALOGUE_JOURNEY_FIXTURE";

export const CatalogueJourneyMetadataSchema = z
	.object({
		mode: z.enum(["seeded", "synthetic"]),
		searchQuery: z.string().min(1),
		inventorySearchQuery: z.string().min(1),
		mundaneName: z.string().min(1),
		magicName: z.string().min(1),
		rulesVersion: z.literal("2024"),
	})
	.strict();

export function readCatalogueJourneyFixture() {
	const value = process.env[CATALOGUE_JOURNEY_FIXTURE_ENV];
	if (!value)
		throw new Error("Catalogue fixture metadata is missing; run through Playwright global setup.");
	return CatalogueJourneyMetadataSchema.parse(JSON.parse(value));
}
