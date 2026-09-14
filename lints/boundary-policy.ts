import { checkClosures } from "./boundary-closures.js";
import { type BoundaryFinding, boundaryFinding } from "./boundary-finding.js";
import { classifyModule, type Module } from "./boundary-modules.js";
import { allowedImport } from "./boundary-rules.js";
import { isEscapingImport, isLocalAsset } from "./boundary-source.js";
import type { ImportEdge, ImportGraph } from "./import-graph.js";

export function checkBoundaries(root: string, graph: ImportGraph): BoundaryFinding[] {
	const findings: BoundaryFinding[] = [];
	const modules = new Map(
		[...graph.modules.keys()].map((file) => [file, classifyModule(root, file)]),
	);
	const getModule = (file: string) => modules.get(file) ?? classifyModule(root, file);
	for (const [file, source] of modules) {
		if (["test", "tooling"].includes(source.role)) continue;
		if (source.role === "unknown")
			findings.push(
				boundaryFinding(
					source,
					"unknown-module",
					"Declare this module's architectural role; unknown categories are not exempt.",
				),
			);
		if (source.layer === "access" && source.domain !== "characters")
			findings.push(
				boundaryFinding(
					source,
					"access-owner",
					"Only characters/access is an approved persistence access boundary.",
				),
			);
		for (const edge of graph.modules.get(file) ?? []) {
			const issue = edgeIssue(source, edge, getModule);
			if (issue) findings.push(boundaryFinding(source, issue.rule, issue.message, [edge]));
		}
	}
	return [...findings, ...checkClosures(graph, modules)].sort(
		(a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule),
	);
}

function edgeIssue(
	source: Module,
	edge: ImportEdge,
	getModule: (file: string) => Module,
): { rule: string; message: string } | undefined {
	if (edge.kind === "require")
		return {
			rule: "unsupported-require",
			message:
				"Use static ESM imports or literal import(); CommonJS require is forbidden in application source.",
		};
	if (edge.status === "nonliteral")
		return {
			rule: "nonliteral-import",
			message: "Dynamic imports must use a literal target so boundaries can be verified.",
		};
	if (
		edge.status === "unresolved-local" &&
		!(isLocalAsset(edge) && (source.role === "browser" || source.layer === "ui"))
	)
		return {
			rule: "unresolved-import",
			message: `Cannot resolve project import ${edge.specifier}.`,
		};
	if (
		isEscapingImport(edge) ||
		(edge.status === "external" &&
			!!edge.target &&
			!edge.target.includes("/node_modules/") &&
			getModule(edge.target).path.startsWith("../"))
	)
		return {
			rule: "outside-project",
			message:
				"Relative or absolute imports outside the project are not external-package exemptions.",
		};
	if (edge.status === "local" && edge.target && !allowedImport(source, getModule(edge.target)))
		return {
			rule: "dependency-boundary",
			message: `${source.path} cannot import ${getModule(edge.target).path}; use the documented layer/public contract.`,
		};
	return undefined;
}
