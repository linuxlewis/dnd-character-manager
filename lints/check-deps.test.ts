import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { expect, it } from "vitest";

const checker = resolve("lints/check-deps.ts");
const tsx = createRequire(import.meta.url).resolve("tsx");

it.each([
	["types/index.ts", "export {};", 0, "No architectural violations"],
	["schema/index.ts", "export {};", 0, "No architectural violations"],
	["access/index.ts", "export {};", 0, "No architectural violations"],
	["misc/index.ts", "export {};", 1, "unknown-domain-layer"],
	["types/index.ts", 'console.log("forbidden");', 1, "no-console"],
])("checks optional domain shape and retains legacy gates: %s %s", (file, code, status, message) => {
	const root = mkdtempSync(join(tmpdir(), "domain-shape-"));
	try {
		const path = join(root, "src/domains/example", file);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, code);
		const result = spawnSync(process.execPath, ["--import", tsx, checker], {
			cwd: root,
			encoding: "utf8",
		});
		expect(result.status).toBe(status);
		expect(result.stdout + result.stderr).toContain(message);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
