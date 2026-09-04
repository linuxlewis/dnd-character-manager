import { mkdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import {
	computePortSeeds,
	findFreePort,
	getStackPaths,
	isProcessAlive,
	readMetadata,
	runCommand,
	type StackMetadata,
	spawnLogged,
	waitForHttp,
	writeMetadata,
} from "./stack-shared.js";

const existing = readMetadata();
if (existing && isProcessAlive(existing.pids.api) && isProcessAlive(existing.pids.web)) {
	if (existing.mode && existing.mode !== "dev") {
		console.error(`stack is already running in ${existing.mode} mode; run pnpm stop first`);
		process.exit(1);
	}
	await waitForHttp(`${existing.urls.api}/healthz`, 10_000);
	await waitForHttp(existing.urls.web, 10_000);
	console.log("stack already running");
	console.log(`api: ${existing.urls.api}`);
	console.log(`web: ${existing.urls.web}`);
	console.log(`metadata: ${join(existing.dir, "metadata.json")}`);
	process.exit(0);
}

const paths = getStackPaths();
const seeds = computePortSeeds(paths.hash);
const host = process.env.HOST ?? "127.0.0.1";
const configuredDatabaseUrl = process.env.DATABASE_URL;
const ports = {
	api: await findFreePort(seeds.api),
	web: await findFreePort(seeds.web),
	postgres: configuredDatabaseUrl
		? databasePort(configuredDatabaseUrl)
		: await findFreePort(seeds.postgres),
};

mkdirSync(paths.logDir, { recursive: true });

const databaseUrl =
	configuredDatabaseUrl ?? `postgres://app:localdev@127.0.0.1:${ports.postgres}/app`;

if (!configuredDatabaseUrl) {
	console.log(`starting stack database for ${paths.projectName}`);
	runCommand("docker", ["compose", "-p", paths.projectName, "up", "-d", "db"], {
		POSTGRES_PORT: String(ports.postgres),
	});
}

console.log("waiting for database");
await waitForPostgres(databaseUrl);

console.log("running migrations");
runCommand("pnpm", ["db:migrate"], { DATABASE_URL: databaseUrl });

const metadata: StackMetadata = {
	mode: "dev",
	worktreeName: paths.worktreeName,
	projectName: paths.projectName,
	root: paths.root,
	dir: paths.dir,
	ports,
	urls: {
		api: `http://${host}:${ports.api}`,
		web: `http://${host}:${ports.web}`,
	},
	databaseUrl,
	pids: {},
	logs: {
		api: join(paths.logDir, "api.log"),
		web: join(paths.logDir, "web.log"),
	},
	startedAt: new Date().toISOString(),
};

metadata.pids.api = await spawnLogged("pnpm", ["exec", "tsx", "src/server.ts"], metadata.logs.api, {
	BETTER_AUTH_TRUSTED_ORIGINS: `http://${host}:${ports.web}`,
	BETTER_AUTH_URL: `http://${host}:${ports.web}`,
	DATABASE_URL: databaseUrl,
	HOST: host,
	PORT: String(ports.api),
});

metadata.pids.web = await spawnLogged(
	"pnpm",
	[
		"exec",
		"vite",
		"--config",
		"src/app/vite.config.ts",
		"--host",
		"0.0.0.0",
		"--port",
		String(ports.web),
		"--strictPort",
	],
	metadata.logs.web,
	{
		API_ORIGIN: `http://${host}:${ports.api}`,
	},
);

writeMetadata(metadata);

console.log("waiting for api and web");
await waitForHttp(`${metadata.urls.api}/healthz`, 30_000);
await waitForHttp(metadata.urls.web, 30_000);

console.log(`api: ${metadata.urls.api}`);
console.log(`web: ${metadata.urls.web}`);
console.log(`metadata: ${join(metadata.dir, "metadata.json")}`);

async function waitForPostgres(databaseUrl: string) {
	const started = Date.now();
	let lastError: unknown;
	while (Date.now() - started < 30_000) {
		const sql = postgres(databaseUrl, { max: 1, connect_timeout: 2 });
		try {
			await sql`SELECT 1`;
			await sql.end();
			return;
		} catch (err) {
			lastError = err;
			await sql.end().catch(() => undefined);
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`Timed out waiting for Postgres: ${String(lastError)}`);
}

function databasePort(databaseUrl: string) {
	const port = Number(new URL(databaseUrl).port || 5432);
	if (!Number.isInteger(port) || port < 1 || port > 65_535) {
		throw new Error("DATABASE_URL must contain a valid Postgres port.");
	}
	return port;
}
