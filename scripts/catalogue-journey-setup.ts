import postgres from "postgres";
import {
	cleanupCatalogueJourneyFixture,
	prepareCatalogueJourneyFixture,
} from "../tests/e2e/catalogue-journey-fixture.js";
import {
	CATALOGUE_JOURNEY_FIXTURE_ENV,
	CatalogueJourneyMetadataSchema,
} from "./catalogue-journey-metadata.js";
import { createCleanupStack } from "./cleanup-stack.js";

export default async function setupCatalogueJourney() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl)
		throw new Error("DATABASE_URL is required. Run e2e through pnpm test:e2e or pnpm test.");
	const database = postgres(databaseUrl, { max: 1 });
	const cleanup = createCleanupStack();
	cleanup.add(() => database.end());
	cleanup.add(() => cleanupCatalogueJourneyFixture(database));
	cleanup.add(() => {
		delete process.env[CATALOGUE_JOURNEY_FIXTURE_ENV];
	});
	try {
		const fixture = CatalogueJourneyMetadataSchema.parse(
			await prepareCatalogueJourneyFixture(database),
		);
		process.env[CATALOGUE_JOURNEY_FIXTURE_ENV] = JSON.stringify(fixture);
	} catch (setupError) {
		try {
			await cleanup.run();
		} catch (cleanupError) {
			throw new AggregateError(
				[setupError, cleanupError],
				"Catalogue fixture setup and cleanup failed.",
			);
		}
		throw setupError;
	}
	// Playwright owns this teardown across all workers, including failed or retried tests.
	return () => cleanup.run();
}
