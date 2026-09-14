import ts from "typescript";
import { collectForwardedImports } from "./import-forwarding.js";

export interface ImportReference {
	specifier: string | null;
	kind: "import" | "reexport" | "dynamic" | "import-type" | "require";
	typeOnly: boolean;
	line: number;
	column: number;
}

export function collectImportReferences(source: ts.SourceFile): ImportReference[] {
	const references: ImportReference[] = [];
	function add(node: ts.Node, kind: ImportReference["kind"], typeOnly: boolean) {
		const position = source.getLineAndCharacterOfPosition(node.getStart(source));
		references.push({
			specifier: ts.isStringLiteralLike(node) ? node.text : null,
			kind,
			typeOnly,
			line: position.line + 1,
			column: position.character + 1,
		});
	}
	function visit(node: ts.Node) {
		const load = moduleLoad(node);
		if (ts.isImportDeclaration(node)) {
			const clause = node.importClause;
			const bindings = clause?.namedBindings;
			const namedTypesOnly =
				!clause?.name &&
				bindings &&
				ts.isNamedImports(bindings) &&
				bindings.elements.length > 0 &&
				bindings.elements.every((element) => element.isTypeOnly);
			add(node.moduleSpecifier, "import", Boolean(clause?.isTypeOnly || namedTypesOnly));
		} else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
			const clause = node.exportClause;
			const namedTypesOnly =
				clause &&
				ts.isNamedExports(clause) &&
				clause.elements.length > 0 &&
				clause.elements.every((element) => element.isTypeOnly);
			add(node.moduleSpecifier, "reexport", Boolean(node.isTypeOnly || namedTypesOnly));
		} else if (load) {
			add(load.target, load.kind, false);
		} else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
			add(node.argument.literal, "import-type", true);
		} else if (
			ts.isImportEqualsDeclaration(node) &&
			ts.isExternalModuleReference(node.moduleReference) &&
			node.moduleReference.expression
		) {
			add(node.moduleReference.expression, "import", node.isTypeOnly);
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
	return [...references, ...collectForwardedImports(source)].sort(
		(a, b) => a.line - b.line || a.column - b.column,
	);
}

function moduleLoad(node: ts.Node): { target: ts.Node; kind: "dynamic" | "require" } | undefined {
	if (!ts.isCallExpression(node)) return undefined;
	if (node.expression.kind === ts.SyntaxKind.ImportKeyword)
		return { target: node.arguments[0] ?? node, kind: "dynamic" };
	if (ts.isIdentifier(node.expression) && node.expression.text === "require")
		return { target: node.arguments[0] ?? node, kind: "require" };
	return undefined;
}
