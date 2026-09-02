import type { ApiRouteContract } from "@providers/openapi/index.js";
import {
	generatedHeader,
	identifiersReferencedBy,
	importModulePath,
	indent,
	isDefined,
	mergeUsedImports,
	methodParameters,
	pathTemplate,
	requiredClient,
	toPascalCase,
} from "./openapi-generator-support.js";

export type ClientGroup = readonly [string, readonly ApiRouteContract[]];

export function generateClientDomain(group: string, routes: readonly ApiRouteContract[]) {
	const imports = mergeUsedImports(routes, (client) => [
		...identifiersReferencedBy(client.queryParamsType, client),
		...identifiersReferencedBy(client.requestBodyType, client),
		...identifiersReferencedBy(client.responseType, client),
		...identifiersReferencedBy(client.responseParser, client, "value"),
	]);
	const methods = routes.map(generateClientMethod).join("\n\n");
	const queryImport = routes.some((route) => route.client?.queryParamsType)
		? 'import { appendQuery } from "./api-client-core.generated.js";'
		: "";

	return [
		generatedHeader(),
		"",
		imports,
		'import type { ApiClientRuntime, ApiRequestOptions } from "./api-client-core.generated.js";',
		queryImport,
		"",
		`export function create${toPascalCase(group)}ApiClient(runtime: ApiClientRuntime) {`,
		"\treturn {",
		indent(methods, 2),
		"\t};",
		"}",
	].join("\n");
}

export function generateClientCore(clientGroups: readonly ClientGroup[]) {
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
		"\t\t\treturn request<TResponse>(",
		"\t\t\t\tfetchImpl,",
		"\t\t\t\tbaseUrl,",
		"\t\t\t\tmethod,",
		"\t\t\t\tpath,",
		"\t\t\t\trequestOptions,",
		"\t\t\t\tbody,",
		"\t\t\t\tparseResponse,",
		"\t\t\t);",
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
		"export function appendQuery(path: string, query: Record<string, unknown>) {",
		"\tconst search = new URLSearchParams();",
		"\tfor (const [key, value] of Object.entries(query)) {",
		"\t\tif (value !== undefined) search.set(key, String(value));",
		"\t}",
		"\tconst suffix = search.toString();",
		`\treturn suffix ? ${String.fromCharCode(96)}\${path}?\${suffix}${String.fromCharCode(96)} : path;`,
		"}",
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

export function generateClientErrors() {
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

export function groupClientRoutes(routes: readonly ApiRouteContract[]) {
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
		`\t\t${client.queryParamsType ? queryPathTemplate(route.path, client.pathParamsType) : client.pathParamsType ? pathTemplate(route.path) : JSON.stringify(route.path)},`,
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

function queryPathTemplate(path: string, hasPathParams: string | undefined) {
	const pathValue = hasPathParams ? pathTemplate(path) : JSON.stringify(path);
	return `appendQuery(${pathValue}, query)`;
}
