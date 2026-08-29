import { CATALOGUE_SOURCE_MANIFEST } from "../src/domains/catalogue/config/manifest.js";
import { createCatalogueSpellService } from "../src/domains/catalogue/service/index.js";
import { closeDb } from "../src/providers/database/index.js";
import { readMetadata } from "./stack-shared.js";

const metadata = readMetadata();
if (metadata && !process.env.DATABASE_URL) {
	process.env.DATABASE_URL = metadata.databaseUrl;
}

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is required. Run pnpm start before seeding.");
}

try {
	const result = await createCatalogueSpellService().seedFoundrySrd2024Spells();
	console.log(
		`Seeded ${result.processed} SRD 2024 spells from ${CATALOGUE_SOURCE_MANIFEST.source} revision ${CATALOGUE_SOURCE_MANIFEST.sourceRevision}. Packs: ${CATALOGUE_SOURCE_MANIFEST.packs.map((pack) => pack.pack).join(", ")}.`,
	);
} finally {
	await closeDb();
}
