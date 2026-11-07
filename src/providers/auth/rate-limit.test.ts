import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit.js";

describe("createRateLimiter", () => {
	it("allows the limit per window, then reports seconds until the window resets", () => {
		let now = 0;
		const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 }, () => now);

		expect(limiter.consume("player@example.com")).toBeNull();
		expect(limiter.consume("player@example.com")).toBeNull();
		now = 15_000;
		expect(limiter.consume("player@example.com")).toBe(45);
		expect(limiter.consume("other@example.com")).toBeNull();

		now = 60_000;
		expect(limiter.consume("player@example.com")).toBeNull();
	});
});
