import ts from "typescript";
import type { ImportReference } from "./import-references.js";

/** Recognize imported bindings exposed by local export clauses, including renamed bindings. */
export function collectForwardedImports(source: ts.SourceFile): ImportReference[] {
	const bindings = new Map<string, { specifier: string; typeOnly: boolean }>();
	for (const statement of source.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier))
			continue;
		const clause = statement.importClause;
		if (!clause) continue;
		const imported = { specifier: statement.moduleSpecifier.text, typeOnly: clause.isTypeOnly };
		if (clause.name) bindings.set(clause.name.text, imported);
		if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings))
			bindings.set(clause.namedBindings.name.text, imported);
		if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
			for (const binding of clause.namedBindings.elements)
				bindings.set(binding.name.text, {
					...imported,
					typeOnly: imported.typeOnly || binding.isTypeOnly,
				});
		}
	}
	const forwarded: ImportReference[] = [];
	function add(node: ts.Node, name: string, typeOnly: boolean) {
		const imported = bindings.get(name);
		if (!imported) return;
		const position = source.getLineAndCharacterOfPosition(node.getStart(source));
		forwarded.push({
			...imported,
			kind: "reexport",
			typeOnly: imported.typeOnly || typeOnly,
			line: position.line + 1,
			column: position.character + 1,
		});
	}
	for (const statement of source.statements) {
		if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression))
			add(statement.expression, statement.expression.text, false);
		if (
			!ts.isExportDeclaration(statement) ||
			statement.moduleSpecifier ||
			!statement.exportClause ||
			!ts.isNamedExports(statement.exportClause)
		)
			continue;
		for (const binding of statement.exportClause.elements) {
			add(
				binding,
				(binding.propertyName ?? binding.name).text,
				statement.isTypeOnly || binding.isTypeOnly,
			);
		}
	}
	return forwarded;
}
