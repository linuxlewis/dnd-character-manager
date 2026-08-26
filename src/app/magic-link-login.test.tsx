import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MagicLinkLoginForm } from "./magic-link-login.js";

describe("MagicLinkLoginForm", () => {
	it("renders the magic link request form", () => {
		const html = renderForm();

		expect(html).toContain("Email");
		expect(html).toContain("Email sign-in link");
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
