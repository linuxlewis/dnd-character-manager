import { z } from "zod";

/** Lifetime shared by the magic link and the one-time code delivered in the same email. */
export const SIGN_IN_EMAIL_EXPIRES_IN_SECONDS = 5 * 60;

export const MagicLinkRequestSchema = z.object({
	email: z.string().trim().toLowerCase().pipe(z.email()),
});

export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

export const MagicLinkRequestResponseSchema = z.object({
	status: z.literal("sent"),
});

export type MagicLinkRequestResponse = z.infer<typeof MagicLinkRequestResponseSchema>;

export const SignInCodeVerificationSchema = z.object({
	email: z.string().trim().toLowerCase().pipe(z.email()),
	code: z
		.string()
		.trim()
		.regex(/^\d{6}$/, "Sign-in codes are six digits."),
});

export type SignInCodeVerification = z.infer<typeof SignInCodeVerificationSchema>;

export const SignInCodeVerificationResponseSchema = z.object({
	signedIn: z.literal(true),
});

export type SignInCodeVerificationResponse = z.infer<typeof SignInCodeVerificationResponseSchema>;

export const signInRateLimitedMessage =
	"Too many sign-in attempts. Wait a few minutes and try again.";
