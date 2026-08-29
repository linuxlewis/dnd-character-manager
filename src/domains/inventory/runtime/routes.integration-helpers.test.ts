import { describe, expect, it } from "vitest";
import { toCookieHeader } from "./routes.integration-helpers.js";

describe("inventory route integration test helpers", () => {
	it("normalizes set-cookie headers for request injection", () => {
		expect(toCookieHeader(["session=abc; Path=/", "theme=dark; Path=/"])).toBe(
			"session=abc; theme=dark",
		);
	});
});
