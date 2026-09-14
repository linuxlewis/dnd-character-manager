import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildImportGraph, findImportCycles, findImportPath } from "./import-graph.js";

const roots: string[] = [];
function fixture(files: Record<string, string>, options: Record<string, unknown> = {}) {
	const root = mkdtempSync(join(tmpdir(), "import-graph-"));
	roots.push(root);
	const config = {
		compilerOptions: {
			module: "ESNext",
			moduleResolution: "bundler",
			paths: { "@domains/*": ["./src/domains/*"], "@entry": ["./src/entry.ts"] },
			...options,
		},
		include: ["src/**/*.ts", "src/**/*.tsx"],
	};
	for (const [file, content] of Object.entries({
		"tsconfig.json": JSON.stringify(config),
		...files,
	})) {
		const path = join(root, file);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, content);
	}
	return { root, path: (file: string) => join(root, file), graph: buildImportGraph(root) };
}

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("project import graph", () => {
	it("resolves relative, .js, aliases, directory barrels and TSX to real identical targets", () => {
		const { graph, path } = fixture({
			"src/entry.ts": [
				'import { value } from "./domains/example/types/value.js";',
				'import { value as alias } from "@domains/example/types/value";',
				'import { value as barrel } from "./domains/example/types";',
				'import "./view.js";',
			].join("\n"),
			"src/domains/example/types/value.ts": "export const value = 1;",
			"src/domains/example/types/index.ts": 'export { value } from "./value.js";',
			"src/view.tsx": "export const view = <div />;",
		});
		const edges = graph.modules.get(path("src/entry.ts"));
		expect(edges?.map((edge) => edge.target)).toEqual([
			path("src/domains/example/types/value.ts"),
			path("src/domains/example/types/value.ts"),
			path("src/domains/example/types/index.ts"),
			path("src/view.tsx"),
		]);
		expect(edges?.every((edge) => edge.status === "local")).toBe(true);
		expect(graph.issues).toEqual([]);
	});

	it("retains source positions and distinguishes type-only from mixed and side-effect imports", () => {
		const { graph, path } = fixture({
			"src/entry.ts": [
				"import type {",
				"  Value",
				'} from "./value.js";',
				'import { type Value } from "./value.js";',
				'import { type Value, value } from "./value.js";',
				'import "./value.js";',
				'type Other = import("./value.js").Value;',
				'import type External = require("external-package");',
			].join("\n"),
			"src/value.ts": "export type Value = number; export const value = 1;",
		});
		const edges = graph.modules.get(path("src/entry.ts")) ?? [];
		expect(edges.map((edge) => edge.typeOnly)).toEqual([true, true, false, false, true, true]);
		expect(edges[0]).toMatchObject({ line: 3, column: 8, kind: "import" });
		expect(edges[4]).toMatchObject({ kind: "import-type", status: "local" });
		expect(edges[5]).toMatchObject({ kind: "import", status: "external", target: null });
	});

	it("traces named and star reexports to their implementation through a cyclic barrel", () => {
		const { graph, root, path } = fixture({
			"src/entry.ts": 'import { value } from "./barrel.js";',
			"src/barrel.ts": 'export * from "./nested.js";',
			"src/nested.ts": 'export * from "./barrel.js";\nexport { value } from "./service.js";',
			"src/service.ts": "export const value = 1;",
		});
		const trace = findImportPath(
			graph,
			path("src/entry.ts"),
			(edge) => edge.target === path("src/service.ts"),
		);
		expect(trace?.map((edge) => [edge.kind, edge.line])).toEqual([
			["import", 1],
			["reexport", 1],
			["reexport", 2],
		]);
		expect(findImportPath(graph, path("src/entry.ts"), () => false)).toBeUndefined();
		expect(findImportCycles(graph).map((cycle) => cycle.map((edge) => edge.specifier))).toEqual([
			["./nested.js", "./barrel.js"],
		]);
		expect(findImportCycles(buildImportGraph(root))).toEqual(findImportCycles(graph));
	});

	it("handles self-cycles and disconnected cycles deterministically", () => {
		const { graph } = fixture({
			"src/self.ts": 'export * from "./self.js";',
			"src/a.ts": 'export * from "./b.js";',
			"src/b.ts": 'export * from "./a.js";',
		});
		expect(findImportCycles(graph).map((cycle) => cycle.map((edge) => edge.specifier))).toEqual([
			["./b.js", "./a.js"],
			["./self.js"],
		]);
	});

	it("distinguishes type-only star and named reexports from value reexports", () => {
		const { graph, path } = fixture({
			"src/entry.ts": [
				'export type * from "./value.js";',
				'export { type Value } from "./value.js";',
				'export { type Value, value } from "./value.js";',
			].join("\n"),
			"src/value.ts": "export type Value = number; export const value = 1;",
		});
		expect(graph.modules.get(path("src/entry.ts"))?.map((edge) => edge.typeOnly)).toEqual([
			true,
			true,
			false,
		]);
	});

	it("reports unresolved local and configured aliases while classifying packages separately", () => {
		const { graph, path } = fixture({
			"src/entry.ts": [
				'import "./missing.js";',
				'import "@domains/missing/types";',
				'import "@entry";',
				'import "@missing-package/feature";',
				'import type { External } from "external-package";',
				'import "node:fs";',
			].join("\n"),
			"node_modules/external-package/package.json": JSON.stringify({ types: "index.d.ts" }),
			"node_modules/external-package/index.d.ts":
				'export type External = import("./private").Hidden;',
			"node_modules/external-package/private.d.ts": "export type Hidden = number;",
		});
		expect(graph.issues.map((edge) => [edge.specifier, edge.status, edge.line])).toEqual([
			["./missing.js", "unresolved-local", 1],
			["@domains/missing/types", "unresolved-local", 2],
		]);
		const edges = graph.modules.get(path("src/entry.ts")) ?? [];
		expect(edges[2]).toMatchObject({ status: "local", target: path("src/entry.ts") });
		expect(edges.slice(3).map((edge) => edge.status)).toEqual(["external", "external", "external"]);
		expect(edges[4]).toMatchObject({
			typeOnly: true,
			target: path("node_modules/external-package/index.d.ts"),
		});
		expect([...graph.modules.keys()]).toEqual([path("src/entry.ts")]);
	});

	it("follows literal dynamic imports and reports nonliteral imports for review", () => {
		const { graph, path } = fixture({
			"src/entry.ts": [
				'import("./value.js");',
				"import(`./value.js`);",
				"import(moduleName);",
				// biome-ignore lint/suspicious/noTemplateCurlyInString: source fixture, not interpolation here
				"import(`./${moduleName}.js`);",
			].join("\n"),
			"src/value.ts": "export const value = 1;",
		});
		expect(graph.modules.get(path("src/entry.ts"))?.map((edge) => edge.status)).toEqual([
			"local",
			"local",
			"nonliteral",
			"nonliteral",
		]);
		expect(graph.issues.map((edge) => edge.line)).toEqual([3, 4]);
	});

	it("fails visibly on invalid TypeScript configuration", () => {
		expect(() =>
			fixture({ "src/entry.ts": "export {};" }, { moduleResolution: "invalid" }),
		).toThrow("moduleResolution");
	});
});
