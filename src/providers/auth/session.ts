import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getAuth } from "./auth.js";
import type { CurrentUser, CurrentUserResponse } from "./current-user.js";

type BetterAuthHeaders = Headers & { getSetCookie?: () => string[] };

interface AnonymousSignInResponse {
	token: string;
	user: {
		id: string;
		isAnonymous?: boolean | null;
		name: string;
	};
}

interface BetterAuthSessionResponse {
	session: {
		id: string;
	};
	user: {
		id: string;
		isAnonymous?: boolean | null;
		name: string;
	};
}

export async function getOrCreateCurrentUser(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<CurrentUserResponse> {
	const auth = getAuth();
	const headers = fromNodeHeaders(request.headers);
	const sessionResult = (await auth.api.getSession({
		headers,
		returnHeaders: true,
	})) as { headers: Headers; response: BetterAuthSessionResponse | null };

	forwardSetCookieHeaders(sessionResult.headers, reply);
	if (sessionResult.response) return toCurrentUserResponse(sessionResult.response.user);

	const created = (await auth.api.signInAnonymous({
		headers,
		returnHeaders: true,
	})) as { headers: Headers; response: AnonymousSignInResponse };

	forwardSetCookieHeaders(created.headers, reply);
	return toCurrentUserResponse(created.response.user);
}

export function toCurrentUserResponse(user: {
	id: string;
	isAnonymous?: boolean | null;
	name: string;
}): CurrentUserResponse {
	return {
		user: toCurrentUser(user),
	};
}

export function toCurrentUser(user: {
	id: string;
	isAnonymous?: boolean | null;
	name: string;
}): CurrentUser {
	return {
		id: user.id,
		isAnonymous: Boolean(user.isAnonymous),
		name: user.name,
	};
}

export function getSetCookieHeaders(headers: Headers) {
	const betterAuthHeaders = headers as BetterAuthHeaders;
	const cookies = betterAuthHeaders.getSetCookie?.();
	if (cookies && cookies.length > 0) return cookies;

	const cookie = headers.get("set-cookie");
	return cookie ? [cookie] : [];
}

export function forwardSetCookieHeaders(headers: Headers, reply: FastifyReply) {
	const cookies = getSetCookieHeaders(headers);
	if (cookies.length > 0) reply.header("set-cookie", cookies);
}
