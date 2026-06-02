import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterWorkspace } from "./character-workspace.js";

describe("CharacterWorkspace", () => {
	it("renders the character list as the default route", () => {
		const queryClient = new QueryClient();

		expect(
			renderToString(
				<MantineProvider>
					<QueryClientProvider client={queryClient}>
						<CharacterWorkspace />
					</QueryClientProvider>
				</MantineProvider>,
			),
		).toContain("Characters");
	});
});
