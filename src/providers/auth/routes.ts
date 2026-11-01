import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAuth } from "./auth.js";
import { requestMagicLinkSignIn } from "./magic-link.js";
import { getOrCreateCurrentUser, getSetCookieHeaders } from "./session.js";
import { verifySignInCode } from "./sign-in-code.js";
import { signOutCurrentUser } from "./sign-out.js";

// Sign-in emails are requested and codes verified only through the app-owned routes above, so
// Better Auth's native magic-link request and email-OTP endpoints stay unreachable from browsers.
const blockedBetterAuthRoutes = [
	"/api/auth/sign-in/magic-link",
	"/api/auth/sign-in/email-otp",
	"/api/auth/email-otp/*",
	"/api/auth/forget-password/email-otp",
];

export async function registerAuthRoutes(app: FastifyInstance) {
	app.post("/api/magic-link-requests", async (request, reply) => {
		return requestMagicLinkSignIn(request, reply);
	});

	app.post("/api/sign-in-code-verifications", async (request, reply) => {
		return verifySignInCode(request, reply);
	});

	app.post("/api/sign-out", async (request, reply) => {
		return signOutCurrentUser(request, reply);
	});

	for (const url of blockedBetterAuthRoutes) {
		app.route({
			method: ["GET", "POST"],
			url,
			handler: async (_request, reply) => {
				return reply.status(404).send({ error: "Not found" });
			},
		});
	}

	app.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
		handler: async (request, reply) => {
			const response = await getAuth().handler(toAuthRequest(request));
			await sendAuthResponse(reply, response);
		},
	});

	app.get("/api/current-user", async (request, reply) => {
		return getOrCreateCurrentUser(request, reply);
	});
}

export function toAuthRequest(request: FastifyRequest) {
	const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
	const body = request.body === undefined ? undefined : JSON.stringify(request.body);

	return new Request(url.toString(), {
		method: request.method,
		headers: fromNodeHeaders(request.headers),
		body,
	});
}

export async function sendAuthResponse(reply: FastifyReply, response: Response) {
	reply.status(response.status);
	for (const [key, value] of response.headers.entries()) {
		if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
	}

	const cookies = getSetCookieHeaders(response.headers);
	if (cookies.length > 0) reply.header("set-cookie", cookies);

	const body = await response.text();
	return body.length > 0 ? reply.send(body) : reply.send();
}
