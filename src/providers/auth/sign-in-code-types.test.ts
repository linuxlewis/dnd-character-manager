import { describe, expect, it } from "vitest";
import { SignInCodeVerificationSchema } from "./sign-in-code-types.js";

describe("SignInCodeVerificationSchema", () => {
	it("normalizes the email and trims the code", () => {
		expect(
			SignInCodeVerificationSchema.parse({ email: " Player@Example.COM ", code: " 012345 " }),
		).toEqual({ email: "player@example.com", code: "012345" });
	});

	it.each(["12345", "1234567", "12a456", "12 345", ""])("rejects code %j", (code) => {
		expect(
			SignInCodeVerificationSchema.safeParse({ email: "player@example.com", code }).success,
		).toBe(false);
	});

	it("rejects invalid emails", () => {
		expect(
			SignInCodeVerificationSchema.safeParse({ email: "not-an-email", code: "123456" }).success,
		).toBe(false);
	});
});
