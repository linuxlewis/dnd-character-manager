import type { ApiRouteContract } from "@providers/openapi/index.js";
import { CurrentUserResponseSchema } from "./current-user.js";
import { MagicLinkRequestResponseSchema, MagicLinkRequestSchema } from "./magic-link-types.js";
import { SignOutResponseSchema } from "./sign-out-types.js";

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

const magicLinkImports = [
	{
		kind: "type",
		module: "../providers/auth/magic-link-types.js",
		names: ["MagicLinkRequest", "MagicLinkRequestResponse"],
	},
	{
		kind: "value",
		module: "../providers/auth/magic-link-types.js",
		names: ["MagicLinkRequestResponseSchema"],
	},
] as const;

const signOutImports = [
	{
		kind: "type",
		module: "../providers/auth/sign-out-types.js",
		names: ["SignOutResponse"],
	},
	{
		kind: "value",
		module: "../providers/auth/sign-out-types.js",
		names: ["SignOutResponseSchema"],
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
	{
		method: "post",
		operationId: "requestMagicLinkSignIn",
		path: "/api/magic-link-requests",
		requestBody: MagicLinkRequestSchema,
		responses: {
			202: {
				description: "Magic link request accepted",
				schema: MagicLinkRequestResponseSchema,
			},
			400: { description: "Invalid request body" },
		},
		summary: "Request magic link sign-in",
		tags: ["auth"],
		client: {
			functionName: "requestMagicLinkSignIn",
			imports: magicLinkImports,
			requestBodyType: "MagicLinkRequest",
			responseParser: "MagicLinkRequestResponseSchema",
			responseType: "MagicLinkRequestResponse",
		},
	},
	{
		method: "post",
		operationId: "signOutCurrentUser",
		path: "/api/sign-out",
		responses: {
			200: { description: "Signed out current user", schema: SignOutResponseSchema },
		},
		summary: "Sign out current user",
		tags: ["auth"],
		client: {
			functionName: "signOutCurrentUser",
			imports: signOutImports,
			responseParser: "SignOutResponseSchema",
			responseType: "SignOutResponse",
		},
	},
] as const satisfies readonly ApiRouteContract[];
