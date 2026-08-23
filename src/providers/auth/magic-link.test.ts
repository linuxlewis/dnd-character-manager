import { describe, expect, it, vi } from "vitest";
import {
	createResendMagicLinkSender,
	getMagicLinkDeliveryMode,
	getMagicLinkDisplayName,
	getResendMagicLinkConfig,
	sendMagicLink,
	sendMagicLinkWithLogger,
} from "./magic-link.js";

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

describe("getMagicLinkDeliveryMode", () => {
	it("uses log delivery by default outside production", () => {
		expect(getMagicLinkDeliveryMode({ NODE_ENV: "test" })).toBe("log");
	});

	it("requires an explicit delivery mode in production", () => {
		expect(() => getMagicLinkDeliveryMode({ NODE_ENV: "production" })).toThrow(
			"MAGIC_LINK_DELIVERY is required in production.",
		);
	});

	it("accepts Resend delivery when it is explicitly configured", () => {
		expect(
			getMagicLinkDeliveryMode({
				MAGIC_LINK_DELIVERY: "resend",
				NODE_ENV: "production",
			}),
		).toBe("resend");
	});

	it("rejects unsupported delivery modes", () => {
		expect(() => getMagicLinkDeliveryMode({ MAGIC_LINK_DELIVERY: "smtp" })).toThrow(
			"MAGIC_LINK_DELIVERY must be either log or resend.",
		);
	});
});

describe("getResendMagicLinkConfig", () => {
	it("requires a Resend API key", () => {
		expect(() => getResendMagicLinkConfig({ RESEND_FROM_EMAIL: "no-reply@example.com" })).toThrow(
			"RESEND_API_KEY is required for Resend magic-link delivery.",
		);
	});

	it("requires a sender email address", () => {
		expect(() => getResendMagicLinkConfig({ RESEND_API_KEY: "re_test_key" })).toThrow(
			"RESEND_FROM_EMAIL is required for Resend magic-link delivery.",
		);
	});

	it("parses Resend delivery configuration", () => {
		expect(
			getResendMagicLinkConfig({
				RESEND_API_KEY: "re_test_key",
				RESEND_FROM_EMAIL: "no-reply@dndinventorymanager.com",
				RESEND_REPLY_TO_EMAIL: "support@dndinventorymanager.com",
			}),
		).toEqual({
			apiKey: "re_test_key",
			fromEmail: "no-reply@dndinventorymanager.com",
			replyToEmail: "support@dndinventorymanager.com",
		});
	});

	it("ignores blank optional Resend delivery configuration values", () => {
		expect(
			getResendMagicLinkConfig({
				RESEND_API_KEY: "re_test_key",
				RESEND_FROM_EMAIL: "no-reply@dndinventorymanager.com",
				RESEND_REPLY_TO_EMAIL: "",
			}),
		).toEqual({
			apiKey: "re_test_key",
			fromEmail: "no-reply@dndinventorymanager.com",
		});
	});
});

describe("createResendMagicLinkSender", () => {
	it("sends magic links through the Resend emails API", async () => {
		const send = vi.fn(async () => ({ data: { id: "email-id" }, error: null }));
		const sender = createResendMagicLinkSender(
			{
				apiKey: "re_test_key",
				fromEmail: "no-reply@dndinventorymanager.com",
				replyToEmail: "support@dndinventorymanager.com",
			},
			{ send } as never,
		);

		await sender({
			email: "player@example.com",
			token: "secret-token",
			url: "https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=secret-token&callbackURL=/",
		});

		expect(send).toHaveBeenCalledOnce();
		expect(send).toHaveBeenCalledWith({
			from: "no-reply@dndinventorymanager.com",
			to: ["player@example.com"],
			subject: "Your D&D Character Manager sign-in link",
			html: expect.stringContaining(
				"https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=secret-token&amp;callbackURL=/",
			),
			text: expect.stringContaining(
				"https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=secret-token&callbackURL=/",
			),
			replyTo: "support@dndinventorymanager.com",
		});
	});

	it("throws when Resend rejects the delivery", async () => {
		const send = vi.fn(async () => ({
			data: null,
			error: { message: "The recipient address is invalid.", name: "validation_error" },
		}));
		const sender = createResendMagicLinkSender(
			{
				apiKey: "re_test_key",
				fromEmail: "no-reply@dndinventorymanager.com",
			},
			{ send } as never,
		);

		await expect(
			sender({
				email: "player@example.com",
				token: "secret-token",
				url: "https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=secret-token",
			}),
		).rejects.toThrow("Resend magic-link delivery failed: The recipient address is invalid.");
	});
});

describe("sendMagicLink", () => {
	const delivery = {
		email: "player@example.com",
		token: "secret-token",
		url: "https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=secret-token",
	};

	it("uses structured-log delivery when log mode is configured", async () => {
		const info = vi.fn();

		await sendMagicLink(delivery, {
			env: { MAGIC_LINK_DELIVERY: "log", NODE_ENV: "test" },
			logger: { info } as never,
		});

		expect(info).toHaveBeenCalledWith(
			{
				email: "player@example.com",
				magicLinkUrl:
					"https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=secret-token",
			},
			"Magic link login URL generated",
		);
	});

	it("uses Resend delivery without writing the magic-link URL to logs", async () => {
		const send = vi.fn(async () => ({ data: { id: "email-id" }, error: null }));
		const info = vi.fn();

		await sendMagicLink(delivery, {
			createResendClient: () => ({ send }) as never,
			env: {
				MAGIC_LINK_DELIVERY: "resend",
				NODE_ENV: "production",
				RESEND_API_KEY: "re_test_key",
				RESEND_FROM_EMAIL: "no-reply@dndinventorymanager.com",
			},
			logger: { info } as never,
		});

		expect(send).toHaveBeenCalledOnce();
		expect(info).not.toHaveBeenCalled();
	});
});
