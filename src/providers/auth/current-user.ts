import { z } from "zod";

export const CurrentUserSchema = z.object({
	id: z.string().uuid(),
	isAnonymous: z.boolean(),
	name: z.string(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

export const CurrentUserResponseSchema = z.object({
	user: CurrentUserSchema,
});

export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
