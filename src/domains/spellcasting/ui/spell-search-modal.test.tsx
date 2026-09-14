import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { SpellSearchModal } from "./spell-search-modal.js";

it.each([
	{ slotLevel: 3, title: "Add spell to 3rd-level", label: "Search spells" },
	{ slotLevel: 0, title: "Add cantrip or feature", label: "Search cantrips and features" },
])("renders the $slotLevel search workflow without a closed-dialog fallback", ({
	slotLevel,
	title,
	label,
}) => {
	const client = new QueryClient();
	const html = renderToString(
		<MantineProvider>
			<QueryClientProvider client={client}>
				<SpellSearchModal
					characterId="00000000-0000-4000-8000-000000000001"
					slotLevel={slotLevel}
					onClose={vi.fn()}
					withinPortal={false}
				/>
			</QueryClientProvider>
		</MantineProvider>,
	).replaceAll("<!-- -->", "");
	expect(html).toContain(title);
	expect(html).toContain(label);
	expect(html).not.toContain("No spells found.");
	client.clear();
});
