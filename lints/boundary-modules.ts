import { relative } from "node:path";

export type Layer =
	| "types"
	| "config"
	| "schema"
	| "access"
	| "repo"
	| "service"
	| "runtime"
	| "ui";
export type Role =
	| "domain"
	| "application-types"
	| "query"
	| "workflow"
	| "contract"
	| "browser"
	| "generated"
	| "assembly"
	| "provider"
	| "entrypoint"
	| "tooling"
	| "test"
	| "unknown";
export interface Module {
	path: string;
	role: Role;
	domain?: string;
	layer?: Layer;
	public: boolean;
}
const layers = new Set<Layer>([
	"types",
	"config",
	"schema",
	"access",
	"repo",
	"service",
	"runtime",
	"ui",
]);
const entrypoints = new Set([
	"src/app-server.ts",
	"src/api-contracts.ts",
	"src/server.ts",
	"src/prod-server.ts",
	"src/static-assets.ts",
]);
export const browserProviders = new Set([
	"src/providers/auth/current-user.ts",
	"src/providers/auth/magic-link-types.ts",
	"src/providers/auth/sign-out-types.ts",
]);

export function classifyModule(root: string, file: string): Module {
	const path = relative(root, file).replaceAll("\\", "/");
	const module: Module = {
		path,
		role: "unknown",
		public: /^src\/domains\/[^/]+\/[^/]+\/index\.ts$/.test(path),
	};
	if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(path) || path.startsWith("tests/"))
		return { ...module, role: "test" };
	if (
		!path.startsWith("src/") ||
		path === "src/app/vite.config.ts" ||
		path === "src/server.vite.config.ts"
	)
		return { ...module, role: "tooling" };
	const [, category, owner, layer] = path.split("/");
	if (category === "domains")
		return {
			...module,
			role: layers.has(layer as Layer) ? "domain" : "unknown",
			domain: owner,
			layer: layer as Layer,
		};
	if (category === "application")
		return { ...module, role: applicationRole(path.split("/").slice(3).join("/")) };
	if (category === "app") return { ...module, role: "browser" };
	if (category === "generated" && path.endsWith(".generated.ts"))
		return { ...module, role: "generated" };
	if (category === "database") return { ...module, role: "assembly" };
	if (category === "providers") return { ...module, role: "provider" };
	if (entrypoints.has(path)) return { ...module, role: "entrypoint" };
	return module;
}

function applicationRole(path: string): Role {
	if (path.startsWith("types/")) return "application-types";
	if (path === "query.ts" || path.startsWith("queries/")) return "query";
	if (path === "contract.ts" || path.startsWith("contracts/")) return "contract";
	if (
		path === "workflow.ts" ||
		path === "handler.ts" ||
		path === "routes.ts" ||
		path.startsWith("workflows/") ||
		path.startsWith("handlers/")
	)
		return "workflow";
	if (path.startsWith("ui/") || path.startsWith("cache/")) return "browser";
	return "unknown";
}

export function isBrowserRoot(module: Module): boolean {
	return (
		module.role === "browser" ||
		module.role === "generated" ||
		module.role === "application-types" ||
		module.role === "contract" ||
		(module.role === "domain" && (module.layer === "ui" || module.layer === "types"))
	);
}

export function isBrowserSafe(module: Module): boolean {
	if (module.role === "domain") return ["types", "config", "ui"].includes(module.layer ?? "");
	return (
		["browser", "generated", "application-types", "contract"].includes(module.role) ||
		browserProviders.has(module.path)
	);
}

export function isSchemaLeaf(module: Module): boolean {
	return (
		module.role === "assembly" ||
		(module.role === "domain" && ["schema", "types"].includes(module.layer ?? "")) ||
		module.path === "src/providers/auth/schema.ts"
	);
}
