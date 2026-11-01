import type { ApiRouteContract } from "@providers/openapi/index.js";
import { CurrentUserResponseSchema } from "./current-user.js";
import {
	MagicLinkRequestResponseSchema,
	MagicLinkRequestSchema,
	SignInCodeVerificationResponseSchema,
	SignInCodeVerificationSchema,
} from "./magic-link-types.js";
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

const signInCodeImports = [
	{
		kind: "type",
		module: "../providers/auth/magic-link-types.js",
		names: ["SignInCodeVerification", "SignInCodeVerificationResponse"],
	},
	{
		kind: "value",
		module: "../providers/auth/magic-link-types.js",
		names: ["SignInCodeVerificationResponseSchema"],
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
			429: { description: "Too many sign-in emails requested" },
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
		operationId: "verifySignInCode",
		path: "/api/sign-in-code-verifications",
		requestBody: SignInCodeVerificationSchema,
		responses: {
			200: {
				description: "Signed in with the emailed one-time code",
				schema: SignInCodeVerificationResponseSchema,
			},
			400: { description: "Invalid request body" },
			401: { description: "Invalid or expired sign-in code" },
			429: { description: "Too many sign-in code attempts" },
		},
		summary: "Sign in with an emailed one-time code",
		tags: ["auth"],
		client: {
			functionName: "verifySignInCode",
			imports: signInCodeImports,
			requestBodyType: "SignInCodeVerification",
			responseParser: "SignInCodeVerificationResponseSchema",
			responseType: "SignInCodeVerificationResponse",
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
