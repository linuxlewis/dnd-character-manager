import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import type { ApiRouteContract } from "@providers/openapi/index.js";
import { createOpenApiDocument } from "@providers/openapi/index.js";
import {
	generateClientCore,
	generateClientDomain,
	generateClientErrors,
	groupClientRoutes,
} from "./openapi-generator-client.js";
import {
	generateMutationOptions,
	generateQueryKeys,
	generateQueryOptions,
} from "./openapi-generator-query.js";
import {
	formatGeneratedContent,
	generatedHeader,
	isGeneratedArtifact,
} from "./openapi-generator-support.js";
import { generateTypeExports } from "./openapi-generator-types.js";

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
	const getRoutes = clientRoutes.filter((route) => route.method === "get");
	const mutationRoutes = clientRoutes.filter((route) => route.method !== "get");

	return [
		output(
			"openapi.generated.json",
			JSON.stringify(
				createOpenApiDocument({
					title: "D&D Character Manager API",
					version: "0.1.0",
					routes,
				}),
				null,
				"\t",
			),
			root,
		),
		...clientGroups.map(([group, groupRoutes]) =>
			output(`api-client-${group}.generated.ts`, generateClientDomain(group, groupRoutes), root),
		),
		output("api-client-errors.generated.ts", generateClientErrors(), root),
		output("api-client-core.generated.ts", generateClientCore(clientGroups), root),
		output("api-query-keys.generated.ts", generateQueryKeys(getRoutes), root),
		output("api-query-options.generated.ts", generateQueryOptions(getRoutes), root),
		output("api-mutation-options.generated.ts", generateMutationOptions(mutationRoutes), root),
		output("api-types.generated.ts", generateTypeExports(clientRoutes), root),
		output("api-client.generated.ts", generateCompatibilityBarrel(), root),
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

function output(fileName: string, content: string, root: string): GeneratedOutput {
	const relativePath = `${GENERATED_DIRECTORY}/${fileName}`;
	return {
		relativePath,
		content: formatGeneratedContent(content, relativePath, root),
	};
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
