import { z } from "zod";

export const SignOutResponseSchema = z.object({
	signedOut: z.boolean(),
});

export type SignOutResponse = z.infer<typeof SignOutResponseSchema>;
