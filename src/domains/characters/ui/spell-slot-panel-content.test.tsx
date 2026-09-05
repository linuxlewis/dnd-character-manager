import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellSlotPanelContent } from "./spell-slot-panel-content.js";

describe("SpellSlotPanelContent", () => {
	it("keeps the section heading above spell slots", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotPanelContent
					defaultsPending={false}
					draftTotals={{}}
					historyChanges={[]}
					historyOpen={false}
					isEditing={false}
					level={1}
					nonSlotSpells={[]}
					numberedSpells={[]}
					onApplyDefaults={vi.fn()}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRemoveSpell={vi.fn()}
					onRestoreSlot={vi.fn()}
					onRetrySpellSlots={vi.fn()}
					onRetrySpells={vi.fn()}
					onSaveConfiguration={vi.fn()}
					onToggleEditing={vi.fn()}
					onToggleHistory={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlotActionError={null}
					spellSlots={[]}
					spellSlotsLoading={false}
					spellSlotsUnavailable={false}
					spellsUnavailable={false}
					updatePending={false}
				>
					<span>dialogs</span>
				</SpellSlotPanelContent>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml.indexOf("Spells &amp; Abilities")).toBeLessThan(
			readableHtml.indexOf("Spell slots"),
		);
		expect(readableHtml).toContain("dialogs");
	});
});
