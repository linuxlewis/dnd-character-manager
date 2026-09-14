import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";

const project = resolve(".");
const checker = join(project, "lints/check-boundaries.ts");
const tsx = createRequire(import.meta.url).resolve("tsx");
let root: string;

function writeFixture(file: string, content: string) {
	const path = join(root, file);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
}

function runChecker(args: string[] = []) {
	return spawnSync(process.execPath, ["--import", tsx, checker, ...args], {
		cwd: root,
		encoding: "utf8",
		timeout: 15_000,
	});
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "boundary-cli-"));
	writeFixture(
		"tsconfig.json",
		JSON.stringify({
			compilerOptions: { module: "ESNext", moduleResolution: "bundler" },
			include: ["src/**/*.ts"],
		}),
	);
	writeFixture("src/domains/example/types/index.ts", "export {};\n");
	writeFixture("src/domains/example/service/index.ts", "export const value = 1;\n");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

it.each([[], ["--strict"]])("enforces boundaries with flags %j", (...args) => {
	const valid = runChecker(args);
	expect(valid.status, valid.stderr).toBe(0);
	expect(valid.stdout).toContain("Boundary policy STRICT: 0 finding(s)");
	writeFixture(
		"src/domains/example/types/index.ts",
		'export { value } from "../service/index.js";\n',
	);
	const invalid = runChecker(args);
	expect(invalid.status, invalid.stderr).toBe(1);
	expect(invalid.stdout).toContain("types/index.ts:1:");
	expect(invalid.stdout).toContain("service/index.ts");
});

it.each([
	["--report", "REPORT ONLY (not an enforcement gate)", 0],
	["--json", '"mode": "strict"', 1],
])("reports a missing local target with %s", (flag, label, status) => {
	writeFixture("src/domains/example/types/index.ts", 'export * from "./missing.js";\n');
	const result = runChecker([flag]);
	expect(result.status, result.stderr).toBe(status);
	expect(result.stdout).toContain(label);
	expect(result.stdout).toContain("missing.js");
	if (flag === "--json") expect(JSON.parse(result.stdout).findings).not.toHaveLength(0);
});

it("labels report JSON and does not turn findings into an enforcement gate", () => {
	writeFixture("src/domains/example/types/index.ts", 'export * from "../service/index.js";\n');
	const result = runChecker(["--report", "--json"]);
	expect(result.status, result.stderr).toBe(0);
	const report = JSON.parse(result.stdout);
	expect(report.mode).toBe("report-only");
	expect(report.findings).not.toHaveLength(0);
});

it.each([["--unknown"], ["--strict", "--report"]])("rejects invalid flags %j", (...args) => {
	const result = runChecker(args);
	expect(result.status).toBe(1);
	expect(result.stderr).toContain("Usage:");
});

it("normal pnpm lint rejects bypasses that pass Biome and the legacy checker", () => {
	const manifest = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
	writeFixture(
		"package.json",
		JSON.stringify({ private: true, type: "module", scripts: { lint: manifest.scripts.lint } }),
	);
	cpSync(join(project, "biome.json"), join(root, "biome.json"));
	cpSync(join(project, "lints"), join(root, "lints"), { recursive: true });
	symlinkSync(join(project, "node_modules"), join(root, "node_modules"), "dir");
	const run = (args: string[]) =>
		spawnSync("pnpm", args, { cwd: root, encoding: "utf8", timeout: 20_000 });
	const format = run(["exec", "biome", "check", "--write", "."]);
	expect(format.status, format.stdout + format.stderr).toBe(0);
	const clean = run(["lint"]);
	expect(clean.status, clean.stdout + clean.stderr).toBe(0);
	expect(clean.stdout).toContain("Boundary policy STRICT: 0 finding(s)");

	for (const target of ["../service/index.js", "../../other/service/private.js"]) {
		writeFixture("src/domains/other/service/private.ts", "export const value = 1;\n");
		writeFixture("src/domains/other/service/private.test.ts", "export {};\n");
		writeFixture(
			"src/domains/example/types/index.ts",
			`import { value } from "${target}";\n\nexport const result = value;\n`,
		);
		const biome = run(["exec", "biome", "check", "."]);
		expect(biome.status, biome.stdout + biome.stderr).toBe(0);
		const legacy = run(["exec", "tsx", "lints/check-deps.ts"]);
		expect(legacy.status, legacy.stdout + legacy.stderr).toBe(0);
		expect(legacy.stdout).toContain("No architectural violations");
		const strict = run(["lint"]);
		expect(strict.status, strict.stdout + strict.stderr).toBe(1);
		expect(strict.stdout).toContain("Boundary policy STRICT:");
		expect(strict.stdout).toContain("src/domains/example/types/index.ts:1:");
	}
}, 60_000);
