import { describe, expect, it } from "vitest";
import { authRouteContracts } from "./contract.js";

describe("authRouteContracts", () => {
	it("exposes a browser-callable current-user route", () => {
		expect(authRouteContracts).toMatchObject([
			{
				method: "get",
				operationId: "getCurrentUser",
				path: "/api/current-user",
				client: {
					functionName: "getCurrentUser",
					responseType: "CurrentUserResponse",
				},
			},
		]);
	});
});
