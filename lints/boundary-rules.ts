import { browserProviders, isBrowserSafe, type Layer, type Module } from "./boundary-modules.js";

const ownLayers: Record<Layer, readonly Layer[]> = {
	types: ["types"],
	config: ["types", "config"],
	schema: ["types", "schema"],
	access: ["types", "schema", "access"],
	repo: ["types", "config", "schema", "access", "repo"],
	service: ["types", "config", "schema", "access", "repo", "service"],
	runtime: ["types", "config", "schema", "access", "repo", "service", "runtime"],
	ui: ["types", "config", "ui"],
};
const foreignSchemas: Record<string, readonly string[]> = {
	health: ["characters"],
	spellcasting: ["characters"],
	inventory: ["characters", "catalogue"],
};

function domainImport(source: Module, target: Module): boolean {
	const layer = source.layer as Layer;
	if (target.role === "domain") {
		if (source.domain === target.domain) return ownLayers[layer].includes(target.layer as Layer);
		if (!target.public) return false;
		if (layer === "schema")
			return (
				target.layer === "schema" &&
				(foreignSchemas[source.domain ?? ""] ?? []).includes(target.domain ?? "")
			);
		if (layer === "types") return target.layer === "types";
		if (layer === "ui") return target.layer === "types";
		if (layer === "repo") return target.path === "src/domains/characters/access/index.ts";
		if (layer === "service" || layer === "runtime")
			return target.layer === "types" || target.layer === "service";
		return false;
	}
	if (layer === "ui") return target.role === "generated" || browserProviders.has(target.path);
	if (layer === "schema")
		return (
			["characters", "inventory"].includes(source.domain ?? "") &&
			target.path === "src/providers/auth/schema.ts"
		);
	if (layer === "access")
		return source.domain === "characters" && target.path.startsWith("src/providers/database/");
	return ["repo", "service", "runtime"].includes(layer) && target.role === "provider";
}

function publicDomain(target: Module, layers: readonly Layer[]): boolean {
	return target.role === "domain" && target.public && layers.includes(target.layer as Layer);
}

function applicationImport(source: Module, target: Module): boolean {
	const sameFeature = source.path.split("/")[2] === target.path.split("/")[2];
	switch (source.role) {
		case "application-types":
			return publicDomain(target, ["types"]) || target.role === "application-types";
		case "contract":
			return (
				publicDomain(target, ["types"]) ||
				browserProviders.has(target.path) ||
				(sameFeature && target.role === "application-types") ||
				target.path === "src/providers/openapi/index.ts"
			);
		case "query":
			return (
				publicDomain(target, ["schema", "service", "types", "config"]) ||
				target.path.startsWith("src/providers/database/") ||
				(sameFeature && ["query", "application-types", "contract"].includes(target.role))
			);
		case "workflow":
			return (
				publicDomain(target, ["service", "types"]) ||
				target.role === "provider" ||
				(sameFeature &&
					["workflow", "query", "contract", "application-types"].includes(target.role))
			);
		case "browser":
			return (
				publicDomain(target, ["ui", "types", "config"]) ||
				["browser", "generated", "application-types"].includes(target.role) ||
				browserProviders.has(target.path)
			);
		case "generated":
			return (
				publicDomain(target, ["types"]) ||
				target.role === "generated" ||
				target.role === "application-types" ||
				browserProviders.has(target.path)
			);
		default:
			return false;
	}
}

export function allowedImport(source: Module, target: Module): boolean {
	if (source.role === "unknown" || target.role === "unknown") return false;
	if (source.role === "test" || source.role === "tooling") return true;
	if (target.role === "test" || target.role === "tooling") return false;
	if (source.role === "domain") return domainImport(source, target);
	if (source.role === "assembly")
		return (
			publicDomain(target, ["schema"]) ||
			target.role === "assembly" ||
			target.path === "src/providers/auth/schema.ts"
		);
	if (source.role === "provider")
		return (
			target.role === "provider" ||
			(source.path === "src/providers/database/client.ts" &&
				target.path === "src/database/schema.ts")
		);
	if (source.role === "entrypoint")
		return (
			publicDomain(target, ["runtime", "service", "types"]) ||
			target.role === "provider" ||
			target.role === "entrypoint" ||
			["workflow", "contract"].includes(target.role)
		);
	return applicationImport(source, target);
}

export function forbiddenBrowserTarget(target: Module): boolean {
	return (
		!isBrowserSafe(target) &&
		!["src/providers/openapi/index.ts", "src/providers/openapi/document.ts"].includes(target.path)
	);
}
