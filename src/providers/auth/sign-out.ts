import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getAuth } from "./auth.js";
import { forwardSetCookieHeaders } from "./session.js";
import type { SignOutResponse } from "./sign-out-types.js";

export async function signOutCurrentUser(request: FastifyRequest, reply: FastifyReply) {
	const response = await getAuth().handler(toBetterAuthSignOutRequest(request));
	reply.status(response.status);
	forwardSetCookieHeaders(response.headers, reply);

	const body = (await response.json()) as { success?: boolean };
	return { signedOut: Boolean(body.success) } satisfies SignOutResponse;
}

export function toBetterAuthSignOutRequest(request: FastifyRequest) {
	const url = new URL("/api/auth/sign-out", `http://${request.headers.host ?? "localhost"}`);
	return new Request(url.toString(), {
		method: "POST",
		headers: fromNodeHeaders(request.headers),
	});
}
