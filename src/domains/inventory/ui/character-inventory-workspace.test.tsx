import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { CharacterInventoryWorkspace } from "./character-inventory-workspace.js";

describe("CharacterInventoryWorkspace", () => {
	it("keeps the item recovery workflow available when treasury loading fails", async () => {
		const characterId = "00000000-0000-4000-8000-000000000051";
		const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
		await client
			.fetchQuery({
				queryKey: apiQueryKeys.getCharacterTreasury({ characterId }),
				queryFn: () => Promise.reject(new Error("Treasury offline")),
				retry: false,
			})
			.catch(() => undefined);
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={client}>
					<CharacterInventoryWorkspace characterId={characterId} characterName="Mira Thorn" />
				</QueryClientProvider>
			</MantineProvider>,
		);
		expect(html).toContain("Personal Treasury unavailable");
		expect(html).toContain("Search personal inventory");
		expect(html).toContain("Add item");
		expect(html).toContain('aria-label="View inventory activity"');
		expect(html).not.toContain('data-testid="recent-activity"');
		expect(html).not.toContain("No activity yet");
		client.clear();
	});
});
