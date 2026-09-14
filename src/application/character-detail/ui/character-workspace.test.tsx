import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterWorkspace } from "./character-workspace.js";

describe("CharacterWorkspace", () => {
	it("renders the character creation surface", () => {
		const queryClient = new QueryClient();
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterWorkspace />
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).toContain("Characters");
		expect(html).toContain("Create character");
	});
});
