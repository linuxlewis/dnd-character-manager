import type { Module } from "./boundary-modules.js";
import type { ImportEdge } from "./import-graph.js";

export interface BoundaryFinding {
	file: string;
	line: number;
	column: number;
	rule: string;
	message: string;
	trace: readonly ImportEdge[];
}

export function boundaryFinding(
	module: Module,
	rule: string,
	message: string,
	trace: readonly ImportEdge[] = [],
	location: { line: number; column: number } | undefined = trace[0],
): BoundaryFinding {
	return {
		file: module.path,
		line: location?.line ?? 1,
		column: location?.column ?? 1,
		rule,
		message,
		trace,
	};
}
