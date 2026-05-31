import { describe, expect, it } from "vitest";
import { CurrentUserResponseSchema } from "./current-user.js";

describe("CurrentUserResponseSchema", () => {
	it("accepts the public current-user shape", () => {
		expect(
			CurrentUserResponseSchema.parse({
				user: {
					id: "00000000-0000-4000-8000-000000000000",
					isAnonymous: true,
					name: "Anonymous",
				},
			}),
		).toEqual({
			user: {
				id: "00000000-0000-4000-8000-000000000000",
				isAnonymous: true,
				name: "Anonymous",
			},
		});
	});
});
