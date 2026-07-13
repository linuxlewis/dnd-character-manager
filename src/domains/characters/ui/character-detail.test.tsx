import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { CharacterDetail } from "./character-detail.js";

describe("CharacterDetail", () => {
	it("renders the detail shell with a single character edit affordance", () => {
		const queryClient = new QueryClient();
		const characterId = "00000000-0000-4000-8000-000000000000";
		queryClient.setQueryData(apiQueryKeys.getCharacter({ characterId }), {
			character: {
				id: characterId,
				name: "Mira",
				className: "Fighter",
				level: 7,
				health: {
					currentHp: 28,
					maxHp: 28,
					temporaryHp: 0,
					effectiveMaxHp: 28,
				},
				recentHealthChanges: [],
			},
		});

		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterDetail id={characterId} onNavigate={vi.fn()} />
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).toContain("Character details");
		expect(html).toContain("Edit character");
		expect(html).not.toContain("Edit name");
		expect(html).not.toContain("Edit level");
	});
});
