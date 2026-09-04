import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { type CatalogueTestFixture, startCatalogueTestFixture } from "./catalogue-test-fixture.js";
import { createCleanupStack } from "./cleanup-stack.js";
import {
	assertNoExternalDatabaseUrl,
	getOwnedDatabaseUrl,
	isProcessAlive,
	readMetadata,
	runCommand,
	runCommandAsync,
} from "./stack-shared.js";
import { assertE2eCatalogueCanBeConfigured } from "./test-policy.js";

const args = new Set(process.argv.slice(2));
const suites = {
	unit: args.size === 0 || args.has("--unit"),
	integration: args.size === 0 || args.has("--integration"),
	e2e: args.size === 0 || args.has("--e2e"),
};

const needsStack = suites.integration || suites.e2e;
let shouldStopStack = false;
let catalogueFixture: CatalogueTestFixture | undefined;

let exitCode = 0;
const cleanup = createCleanupStack();
cleanup.add(async () => {
	if (!catalogueFixture) return;
	const fixture = catalogueFixture;
	catalogueFixture = undefined;
	await fixture.close();
});
cleanup.add(() => {
	if (shouldStopStack) runCommand("pnpm", ["stop"]);
});

const signalExitCodes = { SIGINT: 130, SIGTERM: 143 } as const;
let signalExitRequested = false;
const signalHandlers = Object.entries(signalExitCodes).map(([signal, code]) => {
	const handler = () => {
		if (signalExitRequested) return;
		signalExitRequested = true;
		console.error(`Received ${signal}; cleaning up the owned test resources.`);
		void cleanup.run().then(
			() => process.exit(code),
			(error) => {
				console.error(error instanceof Error ? error.message : String(error));
				process.exit(1);
			},
		);
	};
	process.once(signal, handler);
	return { handler, signal };
});

try {
	assertNoExternalDatabaseUrl();

	if (suites.unit) {
		runCommand("pnpm", ["test:unit"]);
	}

	if (needsStack) {
		shouldStopStack = !isStackRunning(readMetadata());
		assertE2eCatalogueCanBeConfigured(suites.e2e, !shouldStopStack);
		if (suites.e2e && shouldStopStack) {
			catalogueFixture = await startCatalogueTestFixture();
		}
		runCommand(
			"pnpm",
			["start"],
			catalogueFixture
				? {
						CATALOGUE_LEGACY_BASE_URL: catalogueFixture.legacyBaseUrl,
						CATALOGUE_OPEN5E_BASE_URL: catalogueFixture.open5eBaseUrl,
						DATABASE_URL: undefined,
					}
				: { DATABASE_URL: undefined },
		);
		const metadata = readMetadata();
		if (!metadata) {
			throw new Error("Stack start completed without metadata.");
		}
		const databaseUrl = getOwnedDatabaseUrl(metadata);

		if (suites.integration) {
			const integrationTests = collectIntegrationTests(join(process.cwd(), "src"));
			if (integrationTests.length === 0) {
				console.log("No integration test files found.");
			} else {
				await runCommandAsync("pnpm", ["exec", "vitest", "run", ...integrationTests], {
					DATABASE_URL: databaseUrl,
				});
			}
		}

		if (suites.e2e) {
			await runCommandAsync("pnpm", ["exec", "playwright", "test"], {
				API_ORIGIN: metadata.urls.api,
				WEB_URL: metadata.urls.web,
				DATABASE_URL: databaseUrl,
			});
		}
	}
} catch (err) {
	exitCode = 1;
	console.error(err instanceof Error ? err.message : String(err));
} finally {
	for (const { signal, handler } of signalHandlers) {
		process.removeListener(signal, handler);
	}
	try {
		await cleanup.run();
	} catch (err) {
		exitCode = 1;
		console.error(err instanceof Error ? err.message : String(err));
	}
}

process.exit(exitCode);

function isStackRunning(metadata: ReturnType<typeof readMetadata>) {
	return Boolean(
		metadata && isProcessAlive(metadata.pids.api) && isProcessAlive(metadata.pids.web),
	);
}

function collectIntegrationTests(dir: string): string[] {
	if (!existsSync(dir)) return [];

	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return collectIntegrationTests(path);
		if (entry.isFile() && /\.integration\.test\.tsx?$/.test(entry.name)) return [path];
		return [];
	});
}
