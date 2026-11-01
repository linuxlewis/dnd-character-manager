import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MagicLinkLoginForm, normalizeSignInCode, validateSignInCode } from "./magic-link-login.js";

describe("MagicLinkLoginForm", () => {
	it("renders the magic link request form", () => {
		const html = renderForm();

		expect(html).toContain("Email");
		expect(html).toContain("Email sign-in link");
		expect(html).toContain("sign-in link and a one-time code");
	});
});

describe("sign-in code input", () => {
	it("strips spaces and dashes pasted from the email", () => {
		expect(normalizeSignInCode(" 482 913 ")).toBe("482913");
		expect(normalizeSignInCode("482-913")).toBe("482913");
	});

	it("accepts six digits and explains anything else", () => {
		expect(validateSignInCode("482 913")).toBeNull();
		expect(validateSignInCode("")).toBe("Code is required");
		expect(validateSignInCode("48291")).toBe("Enter the 6-digit code");
		expect(validateSignInCode("48291a")).toBe("Enter the 6-digit code");
	});
});

function renderForm() {
	const queryClient = new QueryClient();
	return renderToString(
		<MantineProvider>
			<QueryClientProvider client={queryClient}>
				<MagicLinkLoginForm />
			</QueryClientProvider>
		</MantineProvider>,
	);
}
