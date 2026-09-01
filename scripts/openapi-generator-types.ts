import type { ApiRouteContract } from "@providers/openapi/index.js";
import { generatedHeader, namedExport } from "./openapi-generator-support.js";

export function generateTypeExports(routes: readonly ApiRouteContract[]) {
	const namesByModule = new Map<string, Set<string>>();
	for (const route of routes) {
		for (const spec of route.client?.imports ?? []) {
			if (spec.kind === "value") continue;
			const names = namesByModule.get(spec.module) ?? new Set<string>();
			for (const name of spec.names) names.add(name);
			namesByModule.set(spec.module, names);
		}
	}

	const exports = Array.from(namesByModule.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([module, names]) => `export type ${namedExport(Array.from(names).sort(), module)};`);
	return [generatedHeader(), "", ...exports, ""].join("\n");
}
