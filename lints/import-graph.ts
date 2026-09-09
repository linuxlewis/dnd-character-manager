import { isAbsolute, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { collectImportReferences, type ImportReference } from "./import-references.js";

export interface ImportEdge extends ImportReference {
	source: string;
	target: string | null;
	status: "local" | "external" | "unresolved-local" | "nonliteral";
}

export interface ImportGraph {
	modules: ReadonlyMap<string, readonly ImportEdge[]>;
	issues: readonly ImportEdge[];
}

function matchesAlias(specifier: string, pattern: string) {
	const star = pattern.indexOf("*");
	return star === -1
		? specifier === pattern
		: specifier.startsWith(pattern.slice(0, star)) && specifier.endsWith(pattern.slice(star + 1));
}

/** Resolve project imports without executing modules or following external package internals. */
export function buildImportGraph(rootDir: string): ImportGraph {
	const root = resolve(rootDir);
	const configPath = resolve(root, "tsconfig.json");
	const config = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsed = ts.parseJsonConfigFileContent(
		config.config ?? {},
		ts.sys,
		root,
		undefined,
		configPath,
	);
	const errors = config.error ? [config.error] : parsed.errors;
	if (errors.length) {
		throw new Error(
			ts.formatDiagnostics(errors, {
				getCurrentDirectory: () => root,
				getCanonicalFileName: (file) => file,
				getNewLine: () => "\n",
			}),
		);
	}
	const cache = ts.createModuleResolutionCache(root, (file) => file, parsed.options);
	const aliases = Object.keys(parsed.options.paths ?? {});
	const modules = new Map<string, readonly ImportEdge[]>();
	const issues: ImportEdge[] = [];
	const pending = parsed.fileNames.map((file) => resolve(file)).sort();
	function resolveReference(source: string, reference: ImportReference): ImportEdge {
		const edge: ImportEdge = { ...reference, source, target: null, status: "nonliteral" };
		if (reference.specifier === null) return edge;
		const specifier = reference.specifier;
		const result = ts.resolveModuleName(
			specifier,
			source,
			parsed.options,
			ts.sys,
			cache,
		).resolvedModule;
		const localSpecifier =
			specifier.startsWith(".") ||
			isAbsolute(specifier) ||
			aliases.some((alias) => matchesAlias(specifier, alias));
		if (!result) return { ...edge, status: localSpecifier ? "unresolved-local" : "external" };
		const target = resolve(result.resolvedFileName);
		const outsideRoot = relative(root, target).startsWith(`..${sep}`);
		const external =
			result.isExternalLibraryImport || target.includes(`${sep}node_modules${sep}`) || outsideRoot;
		return { ...edge, target, status: external ? "external" : "local" };
	}
	for (let index = 0; index < pending.length; index++) {
		const file = pending[index];
		if (modules.has(file)) continue;
		const content = ts.sys.readFile(file);
		if (content === undefined) throw new Error(`Cannot read import graph module: ${file}`);
		const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
		const edges = collectImportReferences(source).map((reference) =>
			resolveReference(file, reference),
		);
		modules.set(file, edges);
		for (const edge of edges) {
			if (edge.status === "local" && edge.target && /\.[cm]?[jt]sx?$/.test(edge.target))
				pending.push(edge.target);
			if (edge.status === "unresolved-local" || edge.status === "nonliteral") issues.push(edge);
		}
	}
	return { modules: new Map([...modules].sort(([a], [b]) => a.localeCompare(b))), issues };
}

/** A shortest dependency trace, retaining each import's location and type-only distinction. */
export function findImportPath(
	graph: ImportGraph,
	source: string,
	matches: (edge: ImportEdge) => boolean,
): ImportEdge[] | undefined {
	const queue: { file: string; path: ImportEdge[] }[] = [{ file: source, path: [] }];
	const visited = new Set([source]);
	for (let index = 0; index < queue.length; index++) {
		const { file, path } = queue[index];
		for (const edge of graph.modules.get(file) ?? []) {
			const trace = [...path, edge];
			if (matches(edge)) return trace;
			if (edge.status === "local" && edge.target && !visited.has(edge.target)) {
				visited.add(edge.target);
				queue.push({ file: edge.target, path: trace });
			}
		}
	}
	return undefined;
}

/** Deterministic DFS cycle witnesses; deliberately not an enumeration of every simple cycle. */
export function findImportCycles(graph: ImportGraph): ImportEdge[][] {
	const visited = new Set<string>();
	const active = new Map<string, number>();
	const path: ImportEdge[] = [];
	const cycles: ImportEdge[][] = [];
	function visit(file: string) {
		visited.add(file);
		active.set(file, path.length);
		for (const edge of graph.modules.get(file) ?? []) {
			if (edge.status !== "local" || !edge.target) continue;
			const start = active.get(edge.target);
			if (start !== undefined) cycles.push([...path.slice(start), edge]);
			else if (!visited.has(edge.target)) {
				path.push(edge);
				visit(edge.target);
				path.pop();
			}
		}
		active.delete(file);
	}
	for (const file of [...graph.modules.keys()].sort()) if (!visited.has(file)) visit(file);
	return cycles;
}
