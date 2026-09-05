import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	assertNoExternalDatabaseUrl,
	getOwnedDatabaseUrl,
	getStackPaths,
	readMetadata,
	type StackMetadata,
	writeMetadata,
} from "./stack-shared.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe("owned stack metadata", () => {
	it("reconstructs the local database URL from the owned Postgres port", () => {
		expect(getOwnedDatabaseUrl({ ports: { postgres: 5542 } })).toBe(
			"postgres://app:localdev@127.0.0.1:5542/app",
		);
	});

	it("rejects an invalid owned Postgres port", () => {
		expect(() => getOwnedDatabaseUrl({ ports: { postgres: 0 } })).toThrow("valid Postgres port");
	});

	it("rejects an externally supplied database URL for local stack commands", () => {
		expect(() =>
			assertNoExternalDatabaseUrl({
				DATABASE_URL: "postgres://attacker:secret@example.invalid:5432/app",
			}),
		).toThrow("does not accept DATABASE_URL");
	});

	it("does not serialize a runtime database URL or its credentials", () => {
		const directory = mkdtempSync(join(tmpdir(), "dnd-stack-metadata-"));
		temporaryDirectories.push(directory);
		const metadata = {
			mode: "dev" as const,
			worktreeName: "activity-h4",
			projectName: "aft-activity-h4-test",
			root: "/tmp/activity-h4",
			dir: directory,
			ports: { api: 4400, web: 3400, postgres: 5542 },
			urls: {
				api: "http://127.0.0.1:4400",
				web: "http://127.0.0.1:3400",
			},
			pids: { api: 123, web: 456 },
			logs: { api: join(directory, "api.log"), web: join(directory, "web.log") },
			startedAt: "2026-09-04T00:00:00.000Z",
			databaseUrl: "postgres://runtime-user:runtime-secret@example.invalid/app",
		} satisfies StackMetadata & { databaseUrl: string };

		writeMetadata(metadata);

		const serialized = readFileSync(join(directory, "metadata.json"), "utf8");
		expect(serialized).not.toContain("databaseUrl");
		expect(serialized).not.toContain("runtime-secret");
		expect(JSON.parse(serialized)).toMatchObject({
			projectName: metadata.projectName,
			ports: metadata.ports,
		});
	});

	it("redacts a legacy database URL when old metadata is read", () => {
		const root = mkdtempSync(join(tmpdir(), "dnd-stack-root-"));
		temporaryDirectories.push(root);
		const paths = getStackPaths(root);
		mkdirSync(paths.dir, { recursive: true });
		writeFileSync(
			paths.metadataPath,
			JSON.stringify({
				mode: "dev",
				worktreeName: paths.worktreeName,
				projectName: paths.projectName,
				root,
				dir: paths.dir,
				ports: { api: 4400, web: 3400, postgres: 5542 },
				urls: {
					api: "http://127.0.0.1:4400",
					web: "http://127.0.0.1:3400",
				},
				databaseUrl: "postgres://legacy-user:legacy-secret@example.invalid/app",
				pids: {},
				logs: { api: join(paths.logDir, "api.log"), web: join(paths.logDir, "web.log") },
				startedAt: "2026-09-04T00:00:00.000Z",
			}),
		);

		const metadata = readMetadata(root);
		expect(metadata).not.toHaveProperty("databaseUrl");
		const serialized = readFileSync(paths.metadataPath, "utf8");
		expect(serialized).not.toContain("legacy-secret");
		expect(serialized).not.toContain("databaseUrl");
	});
});
