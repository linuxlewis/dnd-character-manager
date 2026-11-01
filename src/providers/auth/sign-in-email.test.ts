import { describe, expect, it } from "vitest";
import {
	buildSignInEmail,
	buildSignInEmailHtml,
	buildSignInEmailText,
	SIGN_IN_EMAIL_EXPIRES_IN_SECONDS,
} from "./sign-in-email.js";

const input = {
	code: "482913",
	url: "https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=abc&callbackURL=/characters",
};

describe("buildSignInEmail", () => {
	it("puts the code in the subject so it is readable from the notification", () => {
		expect(buildSignInEmail(input).subject).toBe("Your D&D Character Manager sign-in code: 482913");
	});

	it("shares one five-minute lifetime between the link and the code", () => {
		expect(SIGN_IN_EMAIL_EXPIRES_IN_SECONDS).toBe(300);
		expect(buildSignInEmailText(input)).toContain("expire in 5 minutes");
	});
});

describe("buildSignInEmailText", () => {
	it("includes both the code and the link", () => {
		const text = buildSignInEmailText(input);

		expect(text).toContain("    482913");
		expect(text).toContain(input.url);
	});
});

describe("buildSignInEmailHtml", () => {
	it("renders the code as one contiguous, monospace, letter-spaced block", () => {
		const html = buildSignInEmailHtml(input);

		expect(html).toMatch(
			/<span style="font-family:'SFMono-Regular'[^"]*font-size:40px[^"]*letter-spacing:10px[^"]*">482913<\/span>/,
		);
	});

	it("keeps an escaped magic-link button and text fallback", () => {
		const html = buildSignInEmailHtml(input);
		const escapedUrl =
			"https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=abc&amp;callbackURL=/characters";

		expect(html).toContain(`<a href="${escapedUrl}"`);
		expect(html).toContain(">Sign in with link</a>");
		expect(html.split(escapedUrl).length - 1).toBe(3);
	});

	it("uses email-safe table layout and brand colors without stylesheets", () => {
		const html = buildSignInEmailHtml(input);

		expect(html).toContain('role="presentation"');
		expect(html).toContain('bgcolor="#101113"');
		expect(html).toContain("background-color:#f43f5e");
		expect(html).toContain('<meta name="color-scheme" content="dark">');
		expect(html).not.toContain("<style");
		expect(html).not.toContain("rgba(");
	});

	it("escapes values interpolated into markup", () => {
		const html = buildSignInEmailHtml({ code: "<b>1</b>", url: 'https://x.test/"onmouseover' });

		expect(html).not.toContain("<b>1</b>");
		expect(html).toContain("&lt;b&gt;1&lt;/b&gt;");
		expect(html).toContain("https://x.test/&quot;onmouseover");
	});
});
