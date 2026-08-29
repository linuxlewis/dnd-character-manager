import type { ApiRouteContract } from "@providers/openapi/index.js";
import {
	generatedHeader,
	importedTypeNames,
	indent,
	mutationFunction,
	namedImport,
	requiredClient,
} from "./openapi-generator-support.js";

export function generateQueryKeys(routes: readonly ApiRouteContract[]) {
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

export function generateQueryOptions(routes: readonly ApiRouteContract[]) {
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
