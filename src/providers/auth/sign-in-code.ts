import { APIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createLogger } from "../telemetry/index.js";
import { getAuth } from "./auth.js";
import { getMagicLinkDisplayName } from "./magic-link.js";
import {
	type SignInCodeVerificationResponse,
	SignInCodeVerificationSchema,
} from "./magic-link-types.js";
import type { SignInRateLimiter } from "./rate-limit.js";
import { forwardSetCookieHeaders } from "./session.js";

export const invalidSignInCodeMessage = "Invalid or expired sign-in code.";

const signInCodeLogger = createLogger("auth.sign-in-code");
const rejectedCodeErrors = new Set(["INVALID_OTP", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS"]);

/**
 * Signs in with the one-time code from the magic-link email. Better Auth's anonymous plugin
 * links the current anonymous session on `/sign-in/*`, so characters transfer exactly as they
 * do for magic-link verification.
 */
export async function verifySignInCode(
	request: FastifyRequest,
	reply: FastifyReply,
	rateLimiter: SignInRateLimiter,
) {
	const result = SignInCodeVerificationSchema.safeParse(request.body);
	if (!result.success) {
		return reply.status(400).send({ error: "Invalid request body." });
	}
	if (rateLimiter.reject("codeVerifications", result.data.email, request, reply)) return reply;

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
		if (isRejectedCodeError(error)) {
			return reply.status(401).send({ error: invalidSignInCodeMessage });
		}
		signInCodeLogger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			"Sign-in code verification failed",
		);
		return reply.status(500).send({ error: "Sign-in code verification failed." });
	}

	return reply.status(200).send({ signedIn: true } satisfies SignInCodeVerificationResponse);
}

function isRejectedCodeError(error: unknown) {
	if (!(error instanceof APIError)) return false;
	const code = (error.body as { code?: unknown } | undefined)?.code;
	return typeof code === "string" && rejectedCodeErrors.has(code);
}
