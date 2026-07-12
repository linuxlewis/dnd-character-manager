import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellSlotList } from "./spell-slot-list.js";

describe("SpellSlotList", () => {
	it("hides empty zero-total slot levels outside edit mode", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotList
					characterSpells={[
						{
							id: "00000000-0000-4000-8000-000000000030",
							slotLevel: 3,
							spellIndex: "magic-missile",
							name: "Magic Missile",
							level: 1,
							url: "/api/2014/spells/magic-missile",
							source: "spell",
						},
					]}
					draftTotals={{}}
					isEditing={false}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRestoreSlot={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlots={[
						{ level: 3, total: 2, used: 1, remaining: 1 },
						{ level: 4, total: 0, used: 0, remaining: 0 },
						{ level: 5, total: 0, used: 0, remaining: 0 },
					]}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(html).toContain('aria-label="Add spell to 3rd-level"');
		expect(html).not.toContain('aria-label="Add spell to 4th-level"');
		expect(html).not.toContain('aria-label="Add spell to 5th-level"');
		expect(html).toContain('aria-label="View Magic Missile details"');
		expect(readableHtml).toContain("Magic Missile");
		expect(readableHtml).toContain("1st-level spell");
		expect(readableHtml).toContain("Total 2");
	});

	it("shows all slot levels while editing", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotList
					characterSpells={[]}
					draftTotals={{}}
					isEditing={true}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRestoreSlot={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlots={[
						{ level: 3, total: 2, used: 1, remaining: 1 },
						{ level: 4, total: 0, used: 0, remaining: 0 },
					]}
				/>
			</MantineProvider>,
		);

		expect(html).toContain('aria-label="Add spell to 3rd-level"');
		expect(html).toContain('aria-label="Add spell to 4th-level"');
		expect(html).toContain("3rd-level slot total");
		expect(html).toContain("4th-level slot total");
	});

	it("keeps a zero-total slot level visible when it has saved spells", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotList
					characterSpells={[
						{
							id: "00000000-0000-4000-8000-000000000031",
							slotLevel: 4,
							spellIndex: "divine-smite",
							name: "Divine Smite",
							level: 2,
							url: "/api/2014/features/divine-smite",
							source: "feature",
						},
					]}
					draftTotals={{}}
					isEditing={false}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRestoreSlot={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlots={[
						{ level: 4, total: 0, used: 0, remaining: 0 },
						{ level: 5, total: 0, used: 0, remaining: 0 },
					]}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(html).toContain('aria-label="Add spell to 4th-level"');
		expect(html).not.toContain('aria-label="Add spell to 5th-level"');
		expect(readableHtml).toContain("Divine Smite");
		expect(readableHtml).toContain("2nd-level feature");
	});
});
