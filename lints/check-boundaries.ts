import { relative } from "node:path";
import { checkBoundaries } from "./boundary-policy.js";
import { buildImportGraph } from "./import-graph.js";

const args = process.argv.slice(2);
if (
	args.some((arg) => !["--report", "--strict", "--json"].includes(arg)) ||
	(args.includes("--report") && args.includes("--strict"))
) {
	throw new Error("Usage: tsx lints/check-boundaries.ts [--report | --strict] [--json]");
}
const root = process.cwd();
const findings = checkBoundaries(root, buildImportGraph(root));
const reportOnly = args.includes("--report");
if (args.includes("--json")) {
	process.stdout.write(
		`${JSON.stringify({ mode: reportOnly ? "report-only" : "strict", findings }, null, 2)}\n`,
	);
} else {
	process.stdout.write(
		`Boundary policy ${reportOnly ? "REPORT ONLY (not an enforcement gate)" : "STRICT"}: ${findings.length} finding(s)\n`,
	);
	for (const finding of findings) {
		process.stdout.write(
			`${finding.file}:${finding.line}:${finding.column} [${finding.rule}] ${finding.message}\n`,
		);
		for (const edge of finding.trace)
			process.stdout.write(
				`  ${relative(root, edge.source)}:${edge.line}:${edge.column} --${edge.typeOnly ? "type " : ""}${edge.kind}--> ${edge.target ? relative(root, edge.target) : edge.specifier}\n`,
			);
	}
}
if (!reportOnly && findings.length) process.exitCode = 1;
