import { startCatalogueTestFixture } from "./catalogue-test-fixture.js";

const fixture = await startCatalogueTestFixture();
console.log(
	`CATALOGUE_FIXTURE_READY ${JSON.stringify({
		open5eBaseUrl: fixture.open5eBaseUrl,
		legacyBaseUrl: fixture.legacyBaseUrl,
	})}`,
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.once(signal, async () => {
		await fixture.close();
		process.exit(0);
	});
}
