import { describe, expect, it } from "vitest";
import { buildSignInEmail } from "./sign-in-email.js";

describe("buildSignInEmail", () => {
	it("puts the code and the link in the subject, text, and HTML", () => {
		const url = "https://characters.dndinventorymanager.com/api/auth/magic-link/verify?token=abc";
		const email = buildSignInEmail({ code: "482913", url });

		expect(email.subject).toBe("Your D&D Character Manager sign-in code: 482913");
		expect(email.text).toContain("482913");
		expect(email.text).toContain(url);
		expect(email.html).toContain(">482913</span>");
		expect(email.html).toContain(`href="${url}"`);
	});

	it("escapes values interpolated into the HTML", () => {
		const { html } = buildSignInEmail({ code: "<b>1</b>", url: 'https://x.test/"onmouseover' });

		expect(html).not.toContain("<b>1</b>");
		expect(html).toContain("&lt;b&gt;1&lt;/b&gt;");
		expect(html).toContain("https://x.test/&quot;onmouseover");
	});
});
