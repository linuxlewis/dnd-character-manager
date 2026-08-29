import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import type { ApiClientContract, ApiRouteContract } from "@providers/openapi/index.js";
import { createOpenApiDocument } from "@providers/openapi/index.js";

const GENERATED_DIRECTORY = "src/generated";

export interface GeneratedOutput {
	relativePath: string;
	content: string;
}

export function createGeneratedOutputs(
	routes: readonly ApiRouteContract[],
	root: string,
): readonly GeneratedOutput[] {
	const clientRoutes = routes.filter((route) => route.client);
	const clientGroups = groupClientRoutes(clientRoutes);
	const typesOutput = {
		relativePath: `${GENERATED_DIRECTORY}/api-types.generated.ts`,
		content: formatGeneratedContent(
			generateTypeExports(clientRoutes),
			`${GENERATED_DIRECTORY}/api-types.generated.ts`,
			root,
		),
	};

	return [
		{
			relativePath: `${GENERATED_DIRECTORY}/openapi.generated.json`,
			content: formatGeneratedContent(
				JSON.stringify(
					createOpenApiDocument({
						title: "D&D Character Manager API",
						version: "0.1.0",
						routes,
					}),
					null,
					"\t",
				),
				`${GENERATED_DIRECTORY}/openapi.generated.json`,
				root,
			),
		},
		...clientGroups.map(([group, groupRoutes]) => ({
			relativePath: `${GENERATED_DIRECTORY}/api-client-${group}.generated.ts`,
			content: formatGeneratedContent(
				generateDomainClient(group, groupRoutes),
				`${GENERATED_DIRECTORY}/api-client-${group}.generated.ts`,
				root,
			),
		})),
		{
			relativePath: `${GENERATED_DIRECTORY}/api-client-errors.generated.ts`,
			content: formatGeneratedContent(
				generateClientErrors(),
				`${GENERATED_DIRECTORY}/api-client-errors.generated.ts`,
				root,
			),
		},
		{
			relativePath: `${GENERATED_DIRECTORY}/api-client-core.generated.ts`,
			content: formatGeneratedContent(
				generateClientCore(clientGroups),
				`${GENERATED_DIRECTORY}/api-client-core.generated.ts`,
				root,
			),
		},
		{
			relativePath: `${GENERATED_DIRECTORY}/api-query-keys.generated.ts`,
			content: formatGeneratedContent(
				generateQueryKeys(clientRoutes.filter((route) => route.method === "get")),
				`${GENERATED_DIRECTORY}/api-query-keys.generated.ts`,
				root,
			),
		},
		{
			relativePath: `${GENERATED_DIRECTORY}/api-query-options.generated.ts`,
			content: formatGeneratedContent(
				generateQueryOptions(clientRoutes.filter((route) => route.method === "get")),
				`${GENERATED_DIRECTORY}/api-query-options.generated.ts`,
				root,
			),
		},
		{
			relativePath: `${GENERATED_DIRECTORY}/api-mutation-options.generated.ts`,
			content: formatGeneratedContent(
				generateMutationOptions(clientRoutes.filter((route) => route.method !== "get")),
				`${GENERATED_DIRECTORY}/api-mutation-options.generated.ts`,
				root,
			),
		},
		typesOutput,
		{
			relativePath: `${GENERATED_DIRECTORY}/api-client.generated.ts`,
			content: formatGeneratedContent(
				generateCompatibilityBarrel(),
				`${GENERATED_DIRECTORY}/api-client.generated.ts`,
				root,
			),
		},
	];
}

export function writeGeneratedOutputs(
	outputs: readonly GeneratedOutput[],
	root: string,
	checkOnly: boolean,
) {
	const generatedDirectory = resolve(root, GENERATED_DIRECTORY);
	const expectedPaths = new Set(outputs.map((output) => output.relativePath));
	const existingPaths = existsSync(generatedDirectory)
		? readdirSync(generatedDirectory)
				.filter((file) => isGeneratedArtifact(file))
				.map((file) => `${GENERATED_DIRECTORY}/${file}`)
		: [];
	const stalePaths = existingPaths.filter((path) => !expectedPaths.has(path));
	const missingPaths = outputs
		.filter((output) => !existsSync(resolve(root, output.relativePath)))
		.map((output) => output.relativePath);

	if (checkOnly) {
		if (missingPaths.length > 0 || stalePaths.length > 0) {
			throw new Error(
				[
					missingPaths.length > 0 ? `Missing generated files: ${missingPaths.join(", ")}.` : "",
					stalePaths.length > 0 ? `Unexpected generated files: ${stalePaths.join(", ")}.` : "",
				]
					.filter(Boolean)
					.join(" "),
			);
		}

		for (const output of outputs) {
			const path = resolve(root, output.relativePath);
			if (readFileSync(path, "utf8") !== output.content) {
				throw new Error(
					`${output.relativePath} is stale. Run "pnpm api:generate" and commit the result.`,
				);
			}
		}
		return;
	}

	mkdirSync(generatedDirectory, { recursive: true });
	for (const stalePath of stalePaths) unlinkSync(resolve(root, stalePath));
	for (const output of outputs) {
		writeFileSync(resolve(root, output.relativePath), output.content);
	}
}

function generateDomainClient(group: string, routes: readonly ApiRouteContract[]) {
	const imports = mergeUsedImports(routes, (client) => [
		...identifiersReferencedBy(client.requestBodyType, client),
		...identifiersReferencedBy(client.responseType, client),
		...identifiersReferencedBy(client.responseParser, client, "value"),
	]);
	const methods = routes.map(generateClientMethod).join("\n\n");

	return [
		generatedHeader(),
		"",
		imports,
		'import type { ApiClientRuntime, ApiRequestOptions } from "./api-client-core.generated.js";',
		"",
		`export function create${toPascalCase(group)}ApiClient(runtime: ApiClientRuntime) {`,
		"\treturn {",
		indent(methods, 2),
		"\t};",
		"}",
	].join("\n");
}

function generateClientCore(clientGroups: readonly [string, readonly ApiRouteContract[]][]) {
	const groupImports = clientGroups.map(
		([group]) =>
			`import { create${toPascalCase(group)}ApiClient } from "./api-client-${group}.generated.js";`,
	);
	const clients = clientGroups.map(
		([group]) => `...create${toPascalCase(group)}ApiClient(runtime),`,
	);

	return [
		generatedHeader(),
		"",
		...groupImports
			.concat('import { ApiClientError } from "./api-client-errors.generated.js";')
			.sort((left, right) => importModulePath(left).localeCompare(importModulePath(right))),
		"",
		"export interface ApiClientOptions {",
		"\tbaseUrl?: string;",
		"\tfetch?: typeof fetch;",
		"}",
		"",
		"export interface ApiRequestOptions {",
		"\theaders?: HeadersInit;",
		"\tsignal?: AbortSignal;",
		"}",
		"",
		"export interface ApiClientRuntime {",
		"\trequest<TResponse>(",
		"\t\tmethod: string,",
		"\t\tpath: string,",
		"\t\toptions?: ApiRequestOptions,",
		"\t\tbody?: unknown,",
		"\t\tparseResponse?: (body: unknown) => TResponse,",
		"\t): Promise<TResponse>;",
		"}",
		"",
		"export function createApiClient(options: ApiClientOptions = {}) {",
		'\tconst baseUrl = options.baseUrl ?? "";',
		"\tconst fetchImpl = options.fetch ?? fetch;",
		"\tconst runtime: ApiClientRuntime = {",
		"\t\trequest<TResponse>(",
		"\t\t\tmethod: string,",
		"\t\t\tpath: string,",
		"\t\t\trequestOptions: ApiRequestOptions = {},",
		"\t\t\tbody?: unknown,",
		"\t\t\tparseResponse?: (body: unknown) => TResponse,",
		"\t\t) {",
		"\t\t\treturn request<TResponse>(fetchImpl, baseUrl, method, path, requestOptions, body, parseResponse);",
		"\t\t},",
		"\t};",
		"",
		"\treturn {",
		indent(clients.join("\n"), 2),
		"\t};",
		"}",
		"",
		"export const apiClient = createApiClient();",
		"",
		"export type ApiClient = ReturnType<typeof createApiClient>;",
		"",
		"async function request<TResponse>(",
		"\tfetchImpl: typeof fetch,",
		"\tbaseUrl: string,",
		"\tmethod: string,",
		"\tpath: string,",
		"\toptions: ApiRequestOptions = {},",
		"\tbody?: unknown,",
		"\tparseResponse?: (body: unknown) => TResponse,",
		"): Promise<TResponse> {",
		"\tconst response = await fetchImpl(baseUrl + path, {",
		"\t\tmethod,",
		'\t\theaders: body === undefined ? options.headers : { "Content-Type": "application/json", ...options.headers },',
		"\t\tbody: body === undefined ? undefined : JSON.stringify(body),",
		"\t\tsignal: options.signal,",
		"\t});",
		"",
		"\tif (!response.ok) {",
		"\t\tthrow new ApiClientError(response.status, await parseBody(response));",
		"\t}",
		"",
		"\tif (response.status === 204) return undefined as TResponse;",
		"\tconst responseBody = await response.json();",
		"\treturn parseResponse ? parseResponse(responseBody) : (responseBody as TResponse);",
		"}",
		"",
		"async function parseBody(response: Response) {",
		'\tconst contentType = response.headers.get("content-type") ?? "";',
		'\tif (contentType.includes("application/json")) return response.json();',
		"\treturn response.text();",
		"}",
	].join("\n");
}

function generateClientErrors() {
	const statusPlaceholder = "$" + "{status}";
	const statusErrorLine = `\t\tsuper(\`API request failed with HTTP ${statusPlaceholder}\`);`;

	return [
		generatedHeader(),
		"",
		"export class ApiClientError extends Error {",
		"\treadonly body: unknown;",
		"\treadonly status: number;",
		"",
		"\tconstructor(status: number, body: unknown) {",
		statusErrorLine,
		'\t\tthis.name = "ApiClientError";',
		"\t\tthis.status = status;",
		"\t\tthis.body = body;",
		"\t}",
		"}",
	].join("\n");
}

function generateQueryKeys(routes: readonly ApiRouteContract[]) {
	const entries = routes.map((route) => {
		const client = requiredClient(route);
		const params = client.pathParamsType ? `params: ${client.pathParamsType}` : "";
		const key = client.pathParamsType
			? `["api", ${JSON.stringify(client.functionName)}, params] as const`
			: `["api", ${JSON.stringify(client.functionName)}] as const`;
		return client.pathParamsType
			? `${client.functionName}: (${params}) =>\n\t${key},`
			: `${client.functionName}: () => ${key},`;
	});

	return [
		generatedHeader(),
		"",
		"export const apiQueryKeys = {",
		indent(entries.join("\n"), 1),
		"} as const;",
	].join("\n");
}

function generateQueryOptions(routes: readonly ApiRouteContract[]) {
	const entries = routes.map((route) => {
		const client = requiredClient(route);
		const params = client.pathParamsType
			? `(params: ${client.pathParamsType}, options: ApiRequestOptions = {})`
			: "(options: ApiRequestOptions = {})";
		const keyCall = client.pathParamsType
			? `apiQueryKeys.${client.functionName}(params)`
			: `apiQueryKeys.${client.functionName}()`;
		const clientCall = client.pathParamsType
			? `client.${client.functionName}(params, options)`
			: `client.${client.functionName}(options)`;
		return [
			`${client.functionName}: ${params} =>`,
			"\tqueryOptions({",
			`\t\tqueryKey: ${keyCall},`,
			`\t\tqueryFn: () => ${clientCall},`,
			"\t}),",
		].join("\n");
	});

	return [
		generatedHeader(),
		"",
		'import { queryOptions } from "@tanstack/react-query";',
		'import { type ApiClient, type ApiRequestOptions, apiClient } from "./api-client-core.generated.js";',
		'import { apiQueryKeys } from "./api-query-keys.generated.js";',
		"",
		"export function createApiQueryOptions(client: ApiClient = apiClient) {",
		"\treturn {",
		indent(entries.join("\n\n"), 2),
		"\t};",
		"}",
		"",
		"export const apiQueries = createApiQueryOptions();",
	].join("\n");
}

function generateMutationOptions(routes: readonly ApiRouteContract[]) {
	const requestTypeNames = importedTypeNames(routes, (client) =>
		identifiersReferencedBy(client.requestBodyType, client),
	);
	const entries = routes.map((route) => {
		const client = requiredClient(route);
		return [
			`${client.functionName}: (options: ApiRequestOptions = {}) =>`,
			"\tmutationOptions({",
			`\t\tmutationKey: ["api", ${JSON.stringify(client.functionName)}] as const,`,
			`\t\tmutationFn: ${mutationFunction(client)},`,
			"\t}),",
		].join("\n");
	});

	return [
		generatedHeader(),
		"",
		'import { mutationOptions } from "@tanstack/react-query";',
		'import { type ApiClient, type ApiRequestOptions, apiClient } from "./api-client-core.generated.js";',
		requestTypeNames.length > 0
			? namedImport("type", requestTypeNames, "./api-types.generated.js")
			: "",
		"",
		"export function createApiMutationOptions(client: ApiClient = apiClient) {",
		"\treturn {",
		indent(entries.join("\n\n"), 2),
		"\t};",
		"}",
		"",
		"export const apiMutations = createApiMutationOptions();",
	]
		.filter((line) => line !== "")
		.join("\n");
}

function generateClientMethod(route: ApiRouteContract) {
	const client = requiredClient(route);
	const parser = client.responseParser
		? `(body: unknown) => ${client.responseParser}.parse(body),`
		: undefined;
	const requestBody = client.requestBodyType
		? "body,"
		: client.responseParser
			? "undefined,"
			: undefined;
	const requestLines = [
		`\treturn runtime.request<${client.responseType}>(`,
		`\t\t${JSON.stringify(route.method.toUpperCase())},`,
		`\t\t${client.pathParamsType ? pathTemplate(route.path) : JSON.stringify(route.path)},`,
		"\t\toptions,",
		requestBody ? `\t\t${requestBody}` : undefined,
		parser ? `\t\t${parser}` : undefined,
		"\t);",
	].filter(isDefined);

	return [
		`${client.functionName}(${methodParameters(client)}): Promise<${client.responseType}> {`,
		...requestLines,
		"},",
	].join("\n");
}

function generateTypeExports(routes: readonly ApiRouteContract[]) {
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

function generateCompatibilityBarrel() {
	return [
		generatedHeader(),
		"",
		'export type { ApiClient, ApiClientOptions, ApiRequestOptions } from "./api-client-core.generated.js";',
		'export { apiClient, createApiClient } from "./api-client-core.generated.js";',
		'export { ApiClientError } from "./api-client-errors.generated.js";',
		'export { apiMutations, createApiMutationOptions } from "./api-mutation-options.generated.js";',
		'export { apiQueryKeys } from "./api-query-keys.generated.js";',
		'export { apiQueries, createApiQueryOptions } from "./api-query-options.generated.js";',
		'export type * from "./api-types.generated.js";',
	].join("\n");
}

function mergeUsedImports(
	routes: readonly ApiRouteContract[],
	usedNames: (client: ApiClientContract) => readonly string[],
) {
	const imports = routes.flatMap((route) => {
		const client = requiredClient(route);
		const names = new Set(usedNames(client));
		return (client.imports ?? []).map((spec) => ({
			...spec,
			names: spec.names.filter((name) => names.has(name)),
		}));
	});
	return mergeImports(imports.filter((spec) => spec.names.length > 0));
}

function importedTypeNames(
	routes: readonly ApiRouteContract[],
	usedNames: (client: ApiClientContract) => readonly string[],
) {
	const names = new Set(
		routes.flatMap((route) => {
			const client = requiredClient(route);
			return usedNames(client);
		}),
	);
	return Array.from(
		new Set(
			routes.flatMap((route) =>
				(route.client?.imports ?? [])
					.filter((spec) => spec.kind !== "value")
					.flatMap((spec) => spec.names.filter((name) => names.has(name))),
			),
		),
	).sort();
}

function identifiersReferencedBy(
	value: string | undefined,
	client: ApiClientContract,
	kind?: "value",
) {
	if (!value) return [];
	return (client.imports ?? [])
		.filter((spec) => kind === undefined || spec.kind === kind)
		.flatMap((spec) => spec.names.filter((name) => value.includes(name)));
}

function mergeImports(
	imports: readonly { kind?: "type" | "value"; module: string; names: readonly string[] }[],
	forceTypeExports = false,
) {
	const importsByModule = new Map<
		string,
		{ kind: "type" | "value"; module: string; names: Set<string> }
	>();
	for (const spec of imports) {
		const kind = spec.kind ?? "type";
		const key = `${kind}:${spec.module}`;
		const entry = importsByModule.get(key) ?? {
			kind,
			module: spec.module,
			names: new Set<string>(),
		};
		for (const name of spec.names) entry.names.add(name);
		importsByModule.set(key, entry);
	}

	return Array.from(importsByModule.entries())
		.sort(([, left], [, right]) => {
			const moduleOrder = left.module.localeCompare(right.module);
			return moduleOrder === 0 ? left.kind.localeCompare(right.kind) : moduleOrder;
		})
		.map(([, spec]) => {
			const names = Array.from(spec.names).sort();
			const importStatement = namedImport(spec.kind, names, spec.module);
			if (spec.kind === "value" || !forceTypeExports) return importStatement;
			return `${importStatement}\nexport type ${namedExport(names, spec.module)};`;
		})
		.join("\n");
}

function namedImport(kind: "type" | "value", names: readonly string[], module: string) {
	const prefix = kind === "value" ? "import" : "import type";
	return [
		`${prefix} {`,
		...names.map((name) => `\t${name},`),
		`} from ${JSON.stringify(module)};`,
	].join("\n");
}

function namedExport(names: readonly string[], module: string) {
	return ["{", ...names.map((name) => `\t${name},`), `} from ${JSON.stringify(module)}`].join("\n");
}

function mutationFunction(client: ApiClientContract) {
	if (client.pathParamsType && client.requestBodyType) {
		return `(variables: { params: ${client.pathParamsType}; body: ${client.requestBodyType} }) =>\n\t\t\tclient.${client.functionName}(variables.params, variables.body, options)`;
	}
	if (client.pathParamsType) {
		return `(params: ${client.pathParamsType}) =>\n\t\t\tclient.${client.functionName}(params, options)`;
	}
	if (client.requestBodyType) {
		return `(body: ${client.requestBodyType}) =>\n\t\t\tclient.${client.functionName}(body, options)`;
	}
	return `() => client.${client.functionName}(options)`;
}

function methodParameters(client: ApiClientContract) {
	const params = [];
	if (client.pathParamsType) params.push(`params: ${client.pathParamsType}`);
	if (client.requestBodyType) params.push(`body: ${client.requestBodyType}`);
	params.push("options: ApiRequestOptions = {}");
	return params.join(", ");
}

function pathTemplate(path: string) {
	const template = path.replaceAll(
		/:([A-Za-z0-9_]+)/g,
		(_match, name: string) => `\${${"params."}${name}}`,
	);
	return `\`${template}\``;
}

function groupClientRoutes(routes: readonly ApiRouteContract[]) {
	const groups = new Map<string, ApiRouteContract[]>();
	for (const route of routes) {
		const group = clientGroup(route);
		const groupRoutes = groups.get(group) ?? [];
		groupRoutes.push(route);
		groups.set(group, groupRoutes);
	}
	return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
}

function clientGroup(route: ApiRouteContract) {
	if (route.tags?.includes("treasury")) return "inventory";

	const pathSegments = route.path.split("/").filter(Boolean);
	if (pathSegments[1] === "characters" && ["spells", "items"].includes(pathSegments[3] ?? "")) {
		return pathSegments[3] ?? "characters";
	}

	return route.tags?.[0] ?? "misc";
}

function requiredClient(route: ApiRouteContract) {
	if (!route.client) throw new Error(`Route ${route.operationId} is missing client metadata.`);
	return route.client;
}

function importModulePath(statement: string) {
	return statement.match(/from "([^"]+)"/)?.[1] ?? statement;
}

function generatedHeader() {
	return "/* This file is generated by scripts/generate-openapi.ts. Do not edit by hand. */";
}

function formatGeneratedContent(content: string, relativePath: string, root: string) {
	const biomePath = resolve(root, "node_modules/.bin/biome");
	if (!existsSync(biomePath)) throw new Error("Biome is required to format generated artifacts.");
	return execFileSync(biomePath, ["format", "--stdin-file-path", relativePath], {
		cwd: root,
		encoding: "utf8",
		input: `${content}\n`,
	});
}

function isGeneratedArtifact(file: string) {
	return file.endsWith(".generated.ts") || file.endsWith(".generated.json");
}

function indent(value: string, level: number) {
	const prefix = "\t".repeat(level);
	return value
		.split("\n")
		.map((line) => (line ? `${prefix}${line}` : line))
		.join("\n");
}

function toPascalCase(value: string) {
	return value
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
		.map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
		.join("");
}

function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}
