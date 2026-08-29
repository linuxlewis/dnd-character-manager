import type { ApiRouteContract } from "@providers/openapi/index.js";
import { describe, expect, it } from "vitest";
import {
	generateClientCore,
	generateClientDomain,
	generateClientErrors,
	groupClientRoutes,
} from "./openapi-generator-client.js";

const routes: readonly ApiRouteContract[] = [
	{
		method: "get",
		operationId: "getWidget",
		path: "/api/widgets/:widgetId",
		responses: { 200: { description: "Widget" } },
		summary: "Get widget",
		tags: ["widgets"],
		client: {
			functionName: "getWidget",
			imports: [
				{
					kind: "type",
					module: "../domains/widgets/types/index.js",
					names: ["WidgetResponse"],
				},
				{
					kind: "value",
					module: "../domains/widgets/types/index.js",
					names: ["WidgetResponseSchema"],
				},
			],
			pathParamsType: "{ widgetId: string }",
			responseParser: "WidgetResponseSchema",
			responseType: "WidgetResponse",
		},
	},
	{
		method: "post",
		operationId: "createWidget",
		path: "/api/widgets",
		requestBody: undefined,
		responses: { 201: { description: "Created widget" } },
		summary: "Create widget",
		tags: ["widgets"],
		client: {
			functionName: "createWidget",
			imports: [
				{
					kind: "type",
					module: "../domains/widgets/types/index.js",
					names: ["CreateWidgetRequest", "WidgetResponse"],
				},
				{
					kind: "value",
					module: "../domains/widgets/types/index.js",
					names: ["WidgetResponseSchema"],
				},
			],
			requestBodyType: "CreateWidgetRequest",
			responseParser: "WidgetResponseSchema",
			responseType: "WidgetResponse",
		},
	},
];
const widgetClient = routes[0].client;
if (!widgetClient) throw new Error("Widget route client metadata is required for this fixture.");

describe("openapi generator client", () => {
	it("generates readable deterministic domain methods", () => {
		const first = generateClientDomain("widgets", routes);
		const second = generateClientDomain("widgets", routes);

		expect(second).toBe(first);
		expect(first).toContain("export function createWidgetsApiClient(runtime: ApiClientRuntime)");
		expect(first).toContain("getWidget(");
		expect(first).toContain(`\`/api/widgets/\${params.widgetId}\``);
		expect(first).toContain("(body: unknown) => WidgetResponseSchema.parse(body)");
		expect(first).toContain("createWidget(");
		expect(first).toContain('"POST"');
	});

	it("generates query arguments and URL serialization for optional boolean filters", () => {
		const queryRoute: ApiRouteContract = {
			method: "get",
			operationId: "listWidgets",
			path: "/api/widgets",
			responses: { 200: { description: "Widgets" } },
			summary: "List widgets",
			client: {
				functionName: "listWidgets",
				queryParamsType: "WidgetQuery",
				responseType: "WidgetListResponse",
			},
		};
		const domain = generateClientDomain("widgets", [queryRoute]);
		const core = generateClientCore([["widgets", [queryRoute]]]);

		expect(domain).toContain("listWidgets(query: WidgetQuery");
		expect(domain).toContain('appendQuery("/api/widgets", query)');
		expect(core).toContain("if (value !== undefined) search.set(key, String(value));");
	});

	it("groups routes and composes the core client", () => {
		const grouped = groupClientRoutes([
			...routes,
			{
				...routes[0],
				operationId: "getSpell",
				path: "/api/characters/:characterId/spells",
				tags: ["spells"],
				client: { ...widgetClient, functionName: "getSpell" },
			},
		]);

		expect(grouped.map(([group]) => group)).toEqual(["spells", "widgets"]);
		const core = generateClientCore(grouped);
		expect(core).toContain("import { createSpellsApiClient }");
		expect(core).toContain("import { createWidgetsApiClient }");
		expect(core).toContain("...createWidgetsApiClient(runtime),");
		expect(generateClientErrors()).toContain("class ApiClientError extends Error");
	});
});
