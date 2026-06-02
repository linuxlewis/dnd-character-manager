import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CharacterDetail } from "./character-detail.js";

describe("CharacterDetail", () => {
	it("renders the detail shell", () => {
		const queryClient = new QueryClient();

		expect(
			renderToString(
				<MantineProvider>
					<QueryClientProvider client={queryClient}>
						<CharacterDetail id="00000000-0000-4000-8000-000000000000" onNavigate={vi.fn()} />
					</QueryClientProvider>
				</MantineProvider>,
			),
		).toContain("Character details");
	});
});
