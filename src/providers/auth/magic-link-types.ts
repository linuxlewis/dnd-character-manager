import { z } from "zod";

export const MagicLinkRequestSchema = z.object({
	email: z.string().trim().toLowerCase().pipe(z.email()),
});

export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

export const MagicLinkRequestResponseSchema = z.object({
	status: z.literal("sent"),
});

export type MagicLinkRequestResponse = z.infer<typeof MagicLinkRequestResponseSchema>;

export const SignOutResponseSchema = z.object({
	signedOut: z.boolean(),
});

export type SignOutResponse = z.infer<typeof SignOutResponseSchema>;
