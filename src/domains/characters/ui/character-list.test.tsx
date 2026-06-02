import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CharacterList } from "./character-list.js";

describe("CharacterList", () => {
	it("renders the character list heading and create action", () => {
		const queryClient = new QueryClient();

		expect(
			renderToString(
				<MantineProvider>
					<QueryClientProvider client={queryClient}>
						<CharacterList onNavigate={vi.fn()} />
					</QueryClientProvider>
				</MantineProvider>,
			),
		).toContain("Create character");
	});
});
