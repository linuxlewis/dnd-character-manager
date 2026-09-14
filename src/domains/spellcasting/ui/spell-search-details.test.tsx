import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { SpellSearchDetails } from "./spell-search-details.js";

it("keeps a way back available while details load and does not offer an add action", () => {
	const client = new QueryClient();
	const html = renderToString(
		<MantineProvider>
			<QueryClientProvider client={client}>
				<SpellSearchDetails
					characterId="character-1"
					spell={{
						index: "light",
						name: "Light",
						level: 0,
						source: "spell",
						url: "/api/2014/spells/light",
					}}
					onBack={vi.fn()}
				/>
			</QueryClientProvider>
		</MantineProvider>,
	);
	expect(html).toContain("Back to search");
	expect(html).toContain("Loading details...");
	expect(html).not.toContain("Add Light");
	client.clear();
});
