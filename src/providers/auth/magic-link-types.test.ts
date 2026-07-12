import { describe, expect, it } from "vitest";
import { MagicLinkRequestSchema } from "./magic-link-types.js";

describe("MagicLinkRequestSchema", () => {
	it("normalizes email addresses before requesting a link", () => {
		expect(MagicLinkRequestSchema.parse({ email: " Player@Example.COM " })).toEqual({
			email: "player@example.com",
		});
	});

	it("rejects invalid email input", () => {
		expect(() => MagicLinkRequestSchema.parse({ email: "not-an-email" })).toThrow();
	});
});
