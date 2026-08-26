import { describe, expect, it } from "vitest";
import { authRouteContracts } from "./contract.js";

describe("authRouteContracts", () => {
	it("exposes browser-callable auth routes", () => {
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
			{
				method: "post",
				operationId: "requestMagicLinkSignIn",
				path: "/api/magic-link-requests",
				client: {
					functionName: "requestMagicLinkSignIn",
					requestBodyType: "MagicLinkRequest",
					responseType: "MagicLinkRequestResponse",
				},
			},
			{
				method: "post",
				operationId: "signOutCurrentUser",
				path: "/api/sign-out",
				client: {
					functionName: "signOutCurrentUser",
					responseType: "SignOutResponse",
				},
			},
		]);
	});
});
