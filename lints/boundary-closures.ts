import { type BoundaryFinding, boundaryFinding } from "./boundary-finding.js";
import { isBrowserRoot, isSchemaLeaf, type Module } from "./boundary-modules.js";
import { forbiddenBrowserTarget } from "./boundary-rules.js";
import { isServerExternal, serverGlobalLocations } from "./boundary-source.js";
import {
	findImportCycles,
	findImportPath,
	type ImportEdge,
	type ImportGraph,
} from "./import-graph.js";

export function checkClosures(
	graph: ImportGraph,
	modules: ReadonlyMap<string, Module>,
): BoundaryFinding[] {
	const findings: BoundaryFinding[] = [];
	const exportGraph: ImportGraph = {
		modules: new Map(
			[...graph.modules].map(([file, edges]) => [
				file,
				edges.filter((edge) => edge.kind === "reexport"),
			]),
		),
		issues: [],
	};
	for (const [file, source] of modules) {
		if (["test", "tooling"].includes(source.role)) continue;
		for (const rule of closureRules(source, modules)) {
			const trace = findImportPath(rule.exportsOnly ? exportGraph : graph, file, rule.forbidden);
			if (trace) findings.push(boundaryFinding(source, rule.name, rule.message, trace));
		}
	}
	for (const cycle of findImportCycles(graph)) {
		if (cycle.some((edge) => isAcyclicLayer(modules.get(edge.source)))) {
			const source = modules.get(cycle[0].source);
			if (source)
				findings.push(
					boundaryFinding(
						source,
						"schema-type-cycle",
						"Schema and value-contract dependencies must be acyclic.",
						cycle,
					),
				);
		}
	}
	return [...findings, ...checkGlobalClosures(graph, modules)];
}

function isAcyclicLayer(module: Module | undefined): boolean {
	return module?.layer === "schema" || module?.layer === "types" || module?.role === "assembly";
}

function closureRules(source: Module, modules: ReadonlyMap<string, Module>) {
	const rules: {
		name: string;
		message: string;
		exportsOnly?: boolean;
		forbidden: (edge: ImportEdge) => boolean;
	}[] = [];
	if (source.public && ["service", "access"].includes(source.layer ?? ""))
		rules.push({
			name: "private-reexport",
			message: "Public behavioral entrypoints may not reexport private lower-layer APIs.",
			exportsOnly: true,
			forbidden: (edge) =>
				edge.status === "local" &&
				!!edge.target &&
				(modules.get(edge.target)?.domain !== source.domain ||
					![source.layer, "types"].includes(modules.get(edge.target)?.layer)),
		});
	if (isBrowserRoot(source))
		rules.push({
			name: "browser-closure",
			message: "Browser/client contract reaches server code or an unapproved module.",
			forbidden: (edge) => {
				const target =
					edge.target && edge.status === "local" ? modules.get(edge.target) : undefined;
				return target ? forbiddenBrowserTarget(target) : isServerExternal(edge.specifier ?? "");
			},
		});
	if (isSchemaLeaf(source) && source.layer !== "types")
		rules.push({
			name: "schema-closure",
			message: "Persistence definitions reach code outside schemas and leaf types.",
			forbidden: (edge) => {
				const target =
					edge.target && edge.status === "local" ? modules.get(edge.target) : undefined;
				return target
					? !isSchemaLeaf(target)
					: edge.status === "external" && !/^(zod|drizzle-orm)(\/|$)/.test(edge.specifier ?? "");
			},
		});
	return rules;
}

function checkGlobalClosures(
	graph: ImportGraph,
	modules: ReadonlyMap<string, Module>,
): BoundaryFinding[] {
	const findings: BoundaryFinding[] = [];
	const browserRoots = [...modules].filter(([, module]) => isBrowserRoot(module));
	for (const [file, source] of modules) {
		if (["test", "tooling"].includes(source.role)) continue;
		const [location] = serverGlobalLocations(file);
		if (!location) continue;
		if (isSchemaLeaf(source) && source.layer !== "types")
			findings.push(
				boundaryFinding(
					source,
					"schema-global",
					"Persistence definitions must not read server runtime globals.",
					[],
					location,
				),
			);
		if (isBrowserRoot(source)) {
			findings.push(
				boundaryFinding(
					source,
					"browser-global",
					`Server globals are reachable from ${source.path}.`,
					[],
					location,
				),
			);
			continue;
		}
		for (const [candidate, module] of browserRoots) {
			const trace = findImportPath(graph, candidate, (edge) => edge.target === file);
			if (!trace) continue;
			findings.push(
				boundaryFinding(
					source,
					"browser-global",
					`Server globals are reachable from ${module.path}.`,
					trace,
					location,
				),
			);
			break;
		}
	}
	return findings;
}
