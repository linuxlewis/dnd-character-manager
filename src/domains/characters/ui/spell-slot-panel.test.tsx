import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { CharacterSpellSlotsPanel } from "./spell-slot-panel.js";

describe("CharacterSpellSlotsPanel", () => {
	it("renders editable spell slot totals, usage controls, and collapsed history", () => {
		const characterId = "00000000-0000-4000-8000-000000000020";
		const queryClient = new QueryClient();
		queryClient.setQueryData(apiQueryKeys.getCharacterSpellSlots({ characterId }), {
			spellSlots: [
				{ level: 1, total: 2, used: 1, remaining: 1 },
				{ level: 2, total: 0, used: 0, remaining: 0 },
			],
			recentSpellSlotChanges: [
				{
					id: "00000000-0000-4000-8000-000000000021",
					action: "used",
					level: 1,
					previous: { total: 2, used: 0, remaining: 2 },
					next: { total: 2, used: 1, remaining: 1 },
					totalDelta: 0,
					usedDelta: 1,
					createdAt: "2026-07-01T12:00:00.000Z",
				},
			],
		});
		queryClient.setQueryData(apiQueryKeys.listCharacterSpells({ characterId }), {
			spells: [
				{
					id: "00000000-0000-4000-8000-000000000029",
					slotLevel: 0,
					spellIndex: "light",
					name: "Light",
					level: 0,
					url: "/api/2014/spells/light",
					source: "spell",
				},
				{
					id: "00000000-0000-4000-8000-000000000030",
					slotLevel: 2,
					spellIndex: "magic-missile",
					name: "Magic Missile",
					level: 1,
					url: "/api/2014/spells/magic-missile",
					source: "spell",
				},
			],
		});

		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterSpellSlotsPanel characterId={characterId} level={7} />
				</QueryClientProvider>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Spell slots");
		expect(readableHtml).toContain("Default profile: tier 7");
		expect(readableHtml).toContain("Cantrips &amp; features");
		expect(html).toContain('aria-label="Add cantrip or feature"');
		expect(readableHtml).toContain("Light");
		expect(readableHtml).toContain("Cantrip");
		expect(readableHtml).toContain("1st-level");
		expect(readableHtml).toContain("1 / 2 remaining");
		expect(readableHtml).toContain("Total 2");
		expect(html).toContain('aria-label="Add spell to 1st-level"');
		expect(html).toContain('aria-label="Add spell to 2nd-level"');
		expect(readableHtml).toContain("Magic Missile");
		expect(readableHtml).toContain("1st-level spell");
		expect(readableHtml).toContain("Edit spells");
		expect(readableHtml).not.toContain("Apply class defaults");
		expect(readableHtml).not.toContain("Apply changes");
		expect(readableHtml).not.toContain("1st-level slot total");
		expect(html).toContain('aria-label="Use 1st-level"');
		expect(readableHtml).toMatch(/>Use<\/span>/);
		expect(html).toContain('aria-label="Restore 1st-level"');
		expect(readableHtml).toMatch(/>Restore<\/span>/);
		expect(readableHtml).toContain("Spell history (1)");
		expect(readableHtml).not.toContain("Used level 1 slot");
	});
});
