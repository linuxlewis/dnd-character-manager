import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createLogger, type Logger } from "../telemetry/index.js";
import { getAuth } from "./auth.js";
import {
	type MagicLinkRequestResponse,
	MagicLinkRequestSchema,
	type SignOutResponse,
} from "./magic-link-types.js";
import { forwardSetCookieHeaders } from "./session.js";

export interface MagicLinkDelivery {
	email: string;
	token: string;
	url: string;
}

type MagicLinkDeliveryEnv = Readonly<Record<string, string | undefined>>;

const magicLinkLogger = createLogger("auth.magic-link");

export async function sendMagicLinkWithLogger(
	delivery: MagicLinkDelivery,
	logger: Pick<Logger, "info"> = magicLinkLogger,
	env: MagicLinkDeliveryEnv = process.env,
) {
	if (!isLogDeliveryEnabled(env)) {
		throw new Error("Magic link log delivery is disabled in production.");
	}

	logger.info(
		{
			email: delivery.email,
			magicLinkUrl: delivery.url,
		},
		"Magic link login URL generated",
	);
}

export function isLogDeliveryEnabled(env: MagicLinkDeliveryEnv = process.env) {
	return env.NODE_ENV !== "production" || env.MAGIC_LINK_ENABLE_LOG_DELIVERY === "true";
}

export function getMagicLinkDisplayName(email: string) {
	return email;
}

export async function requestMagicLinkSignIn(request: FastifyRequest, reply: FastifyReply) {
	const result = MagicLinkRequestSchema.safeParse(request.body);
	if (!result.success) {
		return reply.status(400).send({ error: "Invalid request body." });
	}

	await getAuth().api.signInMagicLink({
		body: {
			email: result.data.email,
			name: getMagicLinkDisplayName(result.data.email),
			callbackURL: "/",
		},
		headers: fromNodeHeaders(request.headers),
	});

	return reply.status(202).send({ status: "sent" } satisfies MagicLinkRequestResponse);
}

export async function signOutCurrentUser(request: FastifyRequest, reply: FastifyReply) {
	const response = await getAuth().handler(toBetterAuthSignOutRequest(request));
	reply.status(response.status);
	forwardSetCookieHeaders(response.headers, reply);

	const body = (await response.json()) as { success?: boolean };
	return { signedOut: Boolean(body.success) } satisfies SignOutResponse;
}

function toBetterAuthSignOutRequest(request: FastifyRequest) {
	const url = new URL("/api/auth/sign-out", `http://${request.headers.host ?? "localhost"}`);
	return new Request(url.toString(), {
		method: "POST",
		headers: fromNodeHeaders(request.headers),
	});
}
