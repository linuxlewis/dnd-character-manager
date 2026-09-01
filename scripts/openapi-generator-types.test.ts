import type { ApiRouteContract } from "@providers/openapi/index.js";
import { describe, expect, it } from "vitest";
import { generateTypeExports } from "./openapi-generator-types.js";

const routes: readonly ApiRouteContract[] = [
	{
		method: "get",
		operationId: "getWidget",
		path: "/api/widgets/:widgetId",
		responses: { 200: { description: "Widget" } },
		summary: "Get widget",
		client: {
			functionName: "getWidget",
			imports: [
				{
					kind: "type",
					module: "../domains/widgets/types/index.js",
					names: ["WidgetResponse", "WidgetId"],
				},
				{
					kind: "value",
					module: "../domains/widgets/types/index.js",
					names: ["WidgetResponseSchema"],
				},
			],
			responseType: "WidgetResponse",
		},
	},
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
					module: "../domains/widgets/extra.js",
					names: ["CreateWidgetRequest"],
				},
			],
			requestBodyType: "CreateWidgetRequest",
			responseType: "WidgetResponse",
		},
	},
];

describe("openapi generator type exports", () => {
	it("emits sorted type-only exports and excludes value imports", () => {
		const generated = generateTypeExports(routes);

		expect(generated.indexOf('from "../domains/widgets/extra.js"')).toBeGreaterThan(-1);
		expect(generated.indexOf('from "../domains/widgets/types/index.js"')).toBeGreaterThan(-1);
		expect(generated).toContain("CreateWidgetRequest");
		expect(generated).toContain("WidgetId");
		expect(generated).not.toContain("WidgetResponseSchema");
		expect(generated.indexOf("WidgetId")).toBeLessThan(generated.indexOf("WidgetResponse"));
		expect(generateTypeExports(routes)).toBe(generated);
	});
});
