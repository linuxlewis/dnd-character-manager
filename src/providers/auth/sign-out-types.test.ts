import { describe, expect, it } from "vitest";
import { SignOutResponseSchema } from "./sign-out-types.js";

describe("SignOutResponseSchema", () => {
	it("accepts a signed-out response", () => {
		expect(SignOutResponseSchema.parse({ signedOut: true })).toEqual({ signedOut: true });
	});

	it("rejects responses without a signedOut flag", () => {
		expect(() => SignOutResponseSchema.parse({})).toThrow();
	});
});
