import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAuth } from "./auth.js";
import { getOrCreateCurrentUser } from "./session.js";

export async function registerAuthRoutes(app: FastifyInstance) {
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

	const cookies = getResponseCookies(response.headers);
	if (cookies.length > 0) reply.header("set-cookie", cookies);

	const body = await response.text();
	return body.length > 0 ? reply.send(body) : reply.send();
}

export function getResponseCookies(headers: Headers) {
	const cookies = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
	if (cookies && cookies.length > 0) return cookies;

	const cookie = headers.get("set-cookie");
	return cookie ? [cookie] : [];
}
