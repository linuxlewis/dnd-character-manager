import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { toBetterAuthSignOutRequest } from "./sign-out.js";

describe("toBetterAuthSignOutRequest", () => {
	it("builds a POST request against Better Auth's sign-out endpoint", () => {
		const request = {
			headers: {
				cookie: "better-auth.session_token=session-token",
				host: "characters.example.com",
			},
		} as FastifyRequest;

		const signOutRequest = toBetterAuthSignOutRequest(request);

		expect(signOutRequest.method).toBe("POST");
		expect(signOutRequest.url).toBe("http://characters.example.com/api/auth/sign-out");
		expect(signOutRequest.headers.get("cookie")).toBe("better-auth.session_token=session-token");
	});
});
