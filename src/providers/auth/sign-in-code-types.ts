import { z } from "zod";

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
