import { APIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getAuth } from "./auth.js";
import { getMagicLinkDisplayName } from "./magic-link.js";
import { forwardSetCookieHeaders } from "./session.js";
import {
	type SignInCodeVerificationResponse,
	SignInCodeVerificationSchema,
} from "./sign-in-code-types.js";

export const invalidSignInCodeMessage = "Invalid or expired sign-in code.";

/**
 * Signs in with the one-time code from the magic-link email. Better Auth's anonymous plugin
 * links the current anonymous session on `/sign-in/*`, so characters transfer exactly as they
 * do for magic-link verification.
 */
export async function verifySignInCode(request: FastifyRequest, reply: FastifyReply) {
	const result = SignInCodeVerificationSchema.safeParse(request.body);
	if (!result.success) {
		return reply.status(400).send({ error: "Invalid request body." });
	}

	try {
		const signedIn = await getAuth().api.signInEmailOTP({
			body: {
				email: result.data.email,
				otp: result.data.code,
				name: getMagicLinkDisplayName(result.data.email),
			},
			headers: fromNodeHeaders(request.headers),
			returnHeaders: true,
		});
		forwardSetCookieHeaders(signedIn.headers, reply);
	} catch (error) {
		if (error instanceof APIError) {
			return reply.status(401).send({ error: invalidSignInCodeMessage });
		}
		throw error;
	}

	return reply.status(200).send({ signedIn: true } satisfies SignInCodeVerificationResponse);
}
