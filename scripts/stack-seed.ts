import { CATALOGUE_SOURCE_MANIFEST } from "../src/domains/catalogue/config/manifest.js";
import {
	createCatalogueItemService,
	createCatalogueSpellService,
} from "../src/domains/catalogue/service/index.js";
import { closeDb } from "../src/providers/database/index.js";
import { createLogger } from "../src/providers/telemetry/index.js";
import { readMetadata } from "./stack-shared.js";

const metadata = readMetadata();
if (metadata && !process.env.DATABASE_URL) {
	process.env.DATABASE_URL = metadata.databaseUrl;
}

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is required. Run pnpm start before seeding.");
}

try {
	const requested = process.argv.slice(2).filter((argument) => argument !== "--");
	const capabilities = requested.length === 0 ? ["spells"] : requested;
	if (capabilities.includes("all")) capabilities.splice(0, capabilities.length, "spells", "items");
	if (capabilities.some((capability) => !["spells", "items"].includes(capability))) {
		throw new Error('Seed targets must be "spells", "items", or "all".');
	}
	const log = createLogger("catalogue.seed");
	for (const capability of capabilities) {
		if (capability === "spells") {
			const result = await createCatalogueSpellService().seedFoundrySrd2024Spells();
			log.info(
				{
					capability,
					processed: result.processed,
					sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision,
				},
				"Catalogue capability seeded",
			);
			continue;
		}
		const result = await createCatalogueItemService().seedFoundrySrd2024Items();
		log.info(
			{ capability, ...result.audit, sourceRevision: CATALOGUE_SOURCE_MANIFEST.sourceRevision },
			"Catalogue capability seeded",
		);
	}
} finally {
	await closeDb();
}
