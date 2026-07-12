import { describe, expect, it, vi } from "vitest";
import { getMagicLinkDisplayName, sendMagicLinkWithLogger } from "./magic-link.js";

describe("getMagicLinkDisplayName", () => {
	it("uses the normalized email as the account display name", () => {
		expect(getMagicLinkDisplayName("player@example.com")).toBe("player@example.com");
	});
});

describe("sendMagicLinkWithLogger", () => {
	it("writes the generated URL with structured logging", async () => {
		const info = vi.fn();

		await sendMagicLinkWithLogger(
			{
				email: "player@example.com",
				token: "secret-token",
				url: "http://localhost/api/auth/magic-link/verify?token=secret-token",
			},
			{ info } as never,
		);

		expect(info).toHaveBeenCalledWith(
			{
				email: "player@example.com",
				magicLinkUrl: "http://localhost/api/auth/magic-link/verify?token=secret-token",
			},
			"Magic link login URL generated",
		);
	});

	it("rejects log delivery in production unless explicitly enabled", async () => {
		const info = vi.fn();

		await expect(
			sendMagicLinkWithLogger(
				{
					email: "player@example.com",
					token: "secret-token",
					url: "http://localhost/api/auth/magic-link/verify?token=secret-token",
				},
				{ info } as never,
				{ NODE_ENV: "production" },
			),
		).rejects.toThrow("Magic link log delivery is disabled in production.");

		expect(info).not.toHaveBeenCalled();
	});
});
