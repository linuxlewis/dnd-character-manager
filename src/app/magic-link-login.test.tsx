import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MagicLinkLoginPanel } from "./magic-link-login.js";

describe("MagicLinkLoginPanel", () => {
	it("renders the magic link request form for anonymous users", () => {
		const html = renderPanel({
			id: "00000000-0000-4000-8000-000000000000",
			isAnonymous: true,
			name: "Anonymous",
		});

		expect(html).toContain("Email");
		expect(html).toContain("Email sign-in link");
	});

	it("renders signed-in account controls for known users", () => {
		const html = renderPanel({
			id: "00000000-0000-4000-8000-000000000001",
			isAnonymous: false,
			name: "player@example.com",
		});

		expect(html).toContain("Signed in as player@example.com");
		expect(html).toContain("Sign out");
	});
});

function renderPanel(currentUser: { id: string; isAnonymous: boolean; name: string }) {
	const queryClient = new QueryClient();
	return renderToString(
		<MantineProvider>
			<QueryClientProvider client={queryClient}>
				<MagicLinkLoginPanel currentUser={currentUser} />
			</QueryClientProvider>
		</MantineProvider>,
	);
}
