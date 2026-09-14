import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { SpellSearchResult } from "./spell-search-result.js";

it("separates inspecting a search result from adding it and defers detail requests", () => {
	const client = new QueryClient();
	const html = renderToString(
		<MantineProvider>
			<QueryClientProvider client={client}>
				<SpellSearchResult
					characterId="character-1"
					spell={{
						index: "light",
						name: "Light",
						level: 0,
						source: "spell",
						url: "/api/2014/spells/light",
					}}
					disabled={false}
					onAdd={vi.fn()}
				/>
			</QueryClientProvider>
		</MantineProvider>,
	);
	expect(html).toContain('aria-expanded="false"');
	expect(html).toContain("View details");
	expect(html).toContain('aria-label="Add Light"');
	expect(client.isFetching()).toBe(0);
	client.clear();
});
