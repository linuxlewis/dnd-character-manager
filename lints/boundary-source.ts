import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";
import ts from "typescript";
import type { ImportEdge } from "./import-graph.js";

const builtins = new Set(builtinModules.map((name) => name.replace(/^node:/, "")));
const serverPackages = ["drizzle-orm", "postgres", "fastify", "pino", "resend", "better-auth"];
export function isServerExternal(specifier: string): boolean {
	return (
		specifier.startsWith("node:") ||
		builtins.has(specifier) ||
		serverPackages.some((name) => specifier === name || specifier.startsWith(`${name}/`))
	);
}

export function isLocalAsset(edge: ImportEdge): boolean {
	const specifier = edge.specifier ?? "";
	return (
		specifier.startsWith(".") &&
		/\.(css|svg|png|jpe?g|gif|webp|ico|woff2?)$/.test(specifier) &&
		existsSync(resolve(dirname(edge.source), specifier))
	);
}

export function isEscapingImport(edge: ImportEdge): boolean {
	return (
		edge.status === "external" &&
		(edge.specifier?.startsWith(".") === true || isAbsolute(edge.specifier ?? ""))
	);
}

/** These syntax checks supplement import edges; they are not a data-flow security scanner. */
export function serverGlobalLocations(file: string): { line: number; column: number }[] {
	const source = ts.createSourceFile(
		file,
		readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
	);
	const locations: { line: number; column: number }[] = [];
	function visit(node: ts.Node) {
		if (
			ts.isIdentifier(node) &&
			["process", "Buffer", "__dirname", "__filename"].includes(node.text)
		) {
			const parent = node.parent;
			if (
				!(ts.isPropertyAccessExpression(parent) && parent.name === node) &&
				!(ts.isPropertyAssignment(parent) && parent.name === node)
			) {
				const position = source.getLineAndCharacterOfPosition(node.getStart(source));
				locations.push({ line: position.line + 1, column: position.character + 1 });
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
	return locations;
}
