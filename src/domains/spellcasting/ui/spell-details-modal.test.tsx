import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { SpellDetailsModal } from "./spell-details-modal.js";

describe("SpellDetailsModal", () => {
	it("renders spell description, higher-level text, and metadata", () => {
		const characterId = "00000000-0000-4000-8000-000000000001";
		const spellId = "00000000-0000-4000-8000-000000000030";
		const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
		client.setQueryData(apiQueryKeys.getCharacterSpellDetails({ characterId, spellId }), {
			spell: {
				id: "00000000-0000-4000-8000-000000000030",
				slotLevel: 3,
				spellIndex: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
				source: "spell",
				desc: ["You create three glowing darts of magical force."],
				higherLevel: ["One more dart is created for each slot level above 1st."],
				metadata: [{ label: "Range", value: "120 feet" }],
			},
		});
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={client}>
					<SpellDetailsModal
						characterId={characterId}
						spellId={spellId}
						onClose={vi.fn()}
						withinPortal={false}
					/>
				</QueryClientProvider>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Magic Missile");
		expect(readableHtml).toContain("Spell 1st-level");
		expect(readableHtml).toContain("You create three glowing darts of magical force.");
		expect(readableHtml).toContain("At Higher Levels");
		expect(readableHtml).toContain("One more dart is created for each slot level above 1st.");
		expect(readableHtml).toContain("Range");
		expect(readableHtml).toContain("120 feet");
	});
});
