import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { CharacterSpellSlotsPanel } from "../../src/domains/spellcasting/ui/index.js";
import { apiQueryKeys } from "../../src/generated/api-client.generated.js";

export function mountSpellPanel(container: HTMLElement, firstId: string, secondId: string) {
	const client = new QueryClient({
		defaultOptions: { queries: { staleTime: Infinity, retry: false } },
	});
	for (const characterId of [firstId, secondId]) {
		client.setQueryData(apiQueryKeys.getCharacterSpellSlots({ characterId }), {
			spellSlots: Array.from({ length: 9 }, (_, index) => ({
				level: index + 1,
				total: 2,
				used: 1,
				remaining: 1,
			})),
			recentSpellSlotChanges: [],
		});
		client.setQueryData(apiQueryKeys.listCharacterSpells({ characterId }), { spells: [] });
	}
	const root = createRoot(container);
	const render = (characterId: string) =>
		root.render(
			<MantineProvider>
				<QueryClientProvider client={client}>
					<CharacterSpellSlotsPanel characterId={characterId} level={3} />
				</QueryClientProvider>
			</MantineProvider>,
		);
	render(firstId);
	return {
		render,
		readSpells: (characterId: string) =>
			client.getQueryData(apiQueryKeys.listCharacterSpells({ characterId })),
		readSlots: (characterId: string) =>
			client.getQueryData(apiQueryKeys.getCharacterSpellSlots({ characterId })),
		dispose: () => {
			root.unmount();
			client.clear();
		},
	};
}
