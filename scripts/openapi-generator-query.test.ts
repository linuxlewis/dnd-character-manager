import type { ApiRouteContract } from "@providers/openapi/index.js";
import { describe, expect, it } from "vitest";
import {
	generateMutationOptions,
	generateQueryKeys,
	generateQueryOptions,
} from "./openapi-generator-query.js";

const getRoutes: readonly ApiRouteContract[] = [
	{
		method: "get",
		operationId: "listWidgets",
		path: "/api/widgets",
		responses: { 200: { description: "Widgets" } },
		summary: "List widgets",
		client: {
			functionName: "listWidgets",
			responseType: "WidgetListResponse",
		},
	},
	{
		method: "get",
		operationId: "getWidget",
		path: "/api/widgets/:widgetId",
		responses: { 200: { description: "Widget" } },
		summary: "Get widget",
		client: {
			functionName: "getWidget",
			pathParamsType: "{ widgetId: string }",
			responseType: "WidgetResponse",
		},
	},
];

const mutationRoutes: readonly ApiRouteContract[] = [
	{
		method: "post",
		operationId: "createWidget",
		path: "/api/widgets",
		responses: { 201: { description: "Created widget" } },
		summary: "Create widget",
		client: {
			functionName: "createWidget",
			imports: [
				{
					kind: "type",
					module: "../domains/widgets/types/index.js",
					names: ["CreateWidgetRequest"],
				},
			],
			requestBodyType: "CreateWidgetRequest",
			responseType: "WidgetResponse",
		},
	},
	{
		method: "delete",
		operationId: "deleteWidget",
		path: "/api/widgets/:widgetId",
		responses: { 204: { description: "Deleted widget" } },
		summary: "Delete widget",
		client: {
			functionName: "deleteWidget",
			pathParamsType: "{ widgetId: string }",
			responseType: "void",
		},
	},
];

describe("openapi generator query helpers", () => {
	it("generates parameterized and parameterless query keys and options", () => {
		const keys = generateQueryKeys(getRoutes);
		const options = generateQueryOptions(getRoutes);

		expect(keys).toContain("listWidgets: () =>");
		expect(keys).toContain("getWidget: (params: { widgetId: string }) =>");
		expect(options).toContain("queryKey: apiQueryKeys.listWidgets()");
		expect(options).toContain("queryFn: () => client.listWidgets(options)");
		expect(options).toContain("queryFn: () => client.getWidget(params, options)");
	});

	it("generates mutation options for body and path variables", () => {
		const mutations = generateMutationOptions(mutationRoutes);

		expect(mutations).toContain("CreateWidgetRequest");
		expect(mutations).toContain("client.createWidget(body, options)");
		expect(mutations).toContain("client.deleteWidget(params, options)");
		expect(mutations).toContain('mutationKey: ["api", "deleteWidget"]');
	});
});
