import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isProcessAlive, readMetadata, runCommand } from "./stack-shared.js";

const args = new Set(process.argv.slice(2));
const suites = {
	unit: args.size === 0 || args.has("--unit"),
	integration: args.size === 0 || args.has("--integration"),
	e2e: args.size === 0 || args.has("--e2e"),
};

const needsStack = suites.integration || suites.e2e;
let shouldStopStack = false;
let catalogueFixture: CatalogueTestFixtureProcess | undefined;

let exitCode = 0;

try {
	if (suites.unit) {
		runCommand("pnpm", ["test:unit"]);
	}

	if (needsStack) {
		shouldStopStack = !isStackRunning(readMetadata());
		if (suites.e2e && shouldStopStack) {
			catalogueFixture = await startCatalogueTestFixtureProcess();
		}
		runCommand(
			"pnpm",
			["start"],
			catalogueFixture
				? {
						CATALOGUE_LEGACY_BASE_URL: catalogueFixture.legacyBaseUrl,
						CATALOGUE_OPEN5E_BASE_URL: catalogueFixture.open5eBaseUrl,
					}
				: {},
		);
		const metadata = readMetadata();
		if (!metadata) {
			throw new Error("Stack start completed without metadata.");
		}

		if (suites.integration) {
			const integrationTests = collectIntegrationTests(join(process.cwd(), "src"));
			if (integrationTests.length === 0) {
				console.log("No integration test files found.");
			} else {
				runCommand("pnpm", ["exec", "vitest", "run", ...integrationTests], {
					DATABASE_URL: metadata.databaseUrl,
				});
			}
		}

		if (suites.e2e) {
			runCommand("pnpm", ["exec", "playwright", "test"], {
				API_ORIGIN: metadata.urls.api,
				WEB_URL: metadata.urls.web,
				DATABASE_URL: metadata.databaseUrl,
			});
		}
	}
} catch (err) {
	exitCode = 1;
	console.error(err instanceof Error ? err.message : String(err));
} finally {
	if (shouldStopStack) {
		try {
			runCommand("pnpm", ["stop"]);
		} catch (err) {
			exitCode = 1;
			console.error(err instanceof Error ? err.message : String(err));
		}
	}
	if (catalogueFixture) {
		try {
			await catalogueFixture.close();
		} catch (err) {
			exitCode = 1;
			console.error(err instanceof Error ? err.message : String(err));
		}
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

interface CatalogueTestFixtureProcess {
	open5eBaseUrl: string;
	legacyBaseUrl: string;
	close: () => Promise<void>;
}

async function startCatalogueTestFixtureProcess(): Promise<CatalogueTestFixtureProcess> {
	const child = spawn("pnpm", ["exec", "tsx", "scripts/catalogue-test-fixture-server.ts"], {
		cwd: process.cwd(),
		detached: true,
		env: process.env,
		stdio: ["ignore", "pipe", "inherit"],
	});
	try {
		const ready = await readFixtureReadyLine(child);
		return {
			...ready,
			close: () => stopFixtureProcess(child),
		};
	} catch (error) {
		await stopFixtureProcess(child);
		throw error;
	}
}

async function readFixtureReadyLine(child: ChildProcess) {
	if (!child.stdout) throw new Error("Catalogue test fixture did not expose stdout.");
	const stdout = child.stdout;
	stdout.setEncoding("utf8");
	return new Promise<{ open5eBaseUrl: string; legacyBaseUrl: string }>((resolve, reject) => {
		let output = "";
		const onData = (chunk: string) => {
			output += chunk;
			const line = output.split("\n").find((value) => value.startsWith("CATALOGUE_FIXTURE_READY "));
			if (!line) return;
			stdout.off("data", onData);
			try {
				resolve(JSON.parse(line.slice("CATALOGUE_FIXTURE_READY ".length)));
			} catch (error) {
				reject(new Error(`Invalid catalogue fixture metadata: ${String(error)}`));
			}
		};
		stdout.on("data", onData);
		child.once("error", reject);
		child.once("exit", (code, signal) => {
			reject(
				new Error(`Catalogue test fixture exited before ready (${code ?? signal ?? "unknown"}).`),
			);
		});
	});
}

async function stopFixtureProcess(child: ChildProcess) {
	if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
	const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
	try {
		process.kill(-child.pid, "SIGTERM");
	} catch {
		try {
			process.kill(child.pid, "SIGTERM");
		} catch {
			return;
		}
	}
	await exited;
}
