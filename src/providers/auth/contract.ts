import type { ApiRouteContract } from "@providers/openapi/index.js";
import { CurrentUserResponseSchema } from "./current-user.js";

const currentUserImports = [
	{
		kind: "type",
		module: "../providers/auth/current-user.js",
		names: ["CurrentUserResponse"],
	},
	{
		kind: "value",
		module: "../providers/auth/current-user.js",
		names: ["CurrentUserResponseSchema"],
	},
] as const;

export const authRouteContracts = [
	{
		method: "get",
		operationId: "getCurrentUser",
		path: "/api/current-user",
		responses: {
			200: { description: "Current user", schema: CurrentUserResponseSchema },
		},
		summary: "Get current user",
		tags: ["auth"],
		client: {
			functionName: "getCurrentUser",
			imports: currentUserImports,
			responseParser: "CurrentUserResponseSchema",
			responseType: "CurrentUserResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
