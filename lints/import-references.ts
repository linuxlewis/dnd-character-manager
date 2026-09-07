import ts from "typescript";

export interface ImportReference {
	specifier: string | null;
	kind: "import" | "reexport" | "dynamic" | "import-type";
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
		} else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments[0]
		) {
			add(node.arguments[0], "dynamic", false);
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
	return references;
}
