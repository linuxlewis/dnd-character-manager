import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurrentUserProvider, useCurrentUser } from "./current-user-provider.js";

describe("CurrentUserProvider", () => {
	it("provides current-user query state to descendants", () => {
		function Probe() {
			const { currentUser, isLoading } = useCurrentUser();
			return <span>{currentUser?.id ?? (isLoading ? "loading" : "empty")}</span>;
		}

		const queryClient = new QueryClient();

		expect(
			renderToString(
				<QueryClientProvider client={queryClient}>
					<CurrentUserProvider>
						<Probe />
					</CurrentUserProvider>
				</QueryClientProvider>,
			),
		).toContain("loading");
	});

	it("rejects usage outside the provider", () => {
		function Probe() {
			useCurrentUser();
			return null;
		}

		expect(() => renderToString(<Probe />)).toThrow(
			"useCurrentUser must be used within CurrentUserProvider.",
		);
	});
});
