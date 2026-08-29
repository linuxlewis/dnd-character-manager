import type { ApiRouteContract } from "@providers/openapi/index.js";
import {
	generatedHeader,
	identifiersReferencedBy,
	importedTypeNames,
	indent,
	mergeUsedImports,
	mutationFunction,
	namedImport,
	requiredClient,
} from "./openapi-generator-support.js";

export function generateQueryKeys(routes: readonly ApiRouteContract[]) {
	const queryImports = mergeUsedImports(routes, (client) => [
		...identifiersReferencedBy(client.queryParamsType, client),
	]);
	const entries = routes.map((route) => {
		const client = requiredClient(route);
		const names = [
			client.pathParamsType ? "params" : undefined,
			client.queryParamsType ? "query" : undefined,
		].filter(Boolean);
		const params = [
			client.pathParamsType ? `params: ${client.pathParamsType}` : undefined,
			client.queryParamsType ? `query: ${client.queryParamsType}` : undefined,
		]
			.filter(Boolean)
			.join(", ");
		const key =
			names.length > 0
				? `["api", ${JSON.stringify(client.functionName)}, ${names.join(", ")}] as const`
				: `["api", ${JSON.stringify(client.functionName)}] as const`;
		return names.length > 0
			? `${client.functionName}: (${params}) =>\n\t${key},`
			: `${client.functionName}: () => ${key},`;
	});

	return [
		generatedHeader(),
		"",
		queryImports,
		"export const apiQueryKeys = {",
		indent(entries.join("\n"), 1),
		"} as const;",
	].join("\n");
}

export function generateQueryOptions(routes: readonly ApiRouteContract[]) {
	const queryImports = mergeUsedImports(routes, (client) => [
		...identifiersReferencedBy(client.queryParamsType, client),
	]);
	const entries = routes.map((route) => {
		const client = requiredClient(route);
		const argumentTypes = [
			client.pathParamsType ? `params: ${client.pathParamsType}` : undefined,
			client.queryParamsType ? `query: ${client.queryParamsType}` : undefined,
		].filter(Boolean);
		const argumentNames = [
			client.pathParamsType ? "params" : undefined,
			client.queryParamsType ? "query" : undefined,
		].filter(Boolean);
		const params =
			argumentTypes.length > 0
				? `(${argumentTypes.join(", ")}, options: ApiRequestOptions = {})`
				: "(options: ApiRequestOptions = {})";
		const keyCall =
			argumentNames.length > 0
				? `apiQueryKeys.${client.functionName}(${argumentNames.join(", ")})`
				: `apiQueryKeys.${client.functionName}()`;
		const clientCall =
			argumentNames.length > 0
				? `client.${client.functionName}(${argumentNames.join(", ")}, options)`
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
		queryImports,
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

export function generateMutationOptions(routes: readonly ApiRouteContract[]) {
	const requestTypeNames = importedTypeNames(routes, (client) =>
		client.requestBodyType ? [client.requestBodyType] : [],
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
