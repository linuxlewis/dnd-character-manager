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
					onRemoveSpell={vi.fn()}
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
		expect(readableHtml).not.toContain("Light");
		expect(readableHtml).toContain("Total 2");
	});

	it("renders a compact usage bar for each visible spell slot level", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotList
					characterSpells={[]}
					draftTotals={{}}
					isEditing={false}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRemoveSpell={vi.fn()}
					onRestoreSlot={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlots={[
						{ level: 3, total: 4, used: 1, remaining: 3 },
						{ level: 4, total: 1, used: 1, remaining: 0 },
					]}
				/>
			</MantineProvider>,
		);

		expect(html).toContain('aria-label="3rd-level spell slots: 3 of 4 remaining"');
		expect(html).toContain('aria-valuenow="75"');
		expect(html).toContain('aria-label="4th-level spell slots: 0 of 1 remaining"');
		expect(html).toContain('aria-valuenow="0"');
	});

	it("renders the last remaining spell slot in red even when the bar is not empty", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotList
					characterSpells={[]}
					draftTotals={{}}
					isEditing={false}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRemoveSpell={vi.fn()}
					onRestoreSlot={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlots={[
						{ level: 3, total: 3, used: 2, remaining: 1 },
						{ level: 4, total: 4, used: 3, remaining: 1 },
					]}
				/>
			</MantineProvider>,
		);

		expect(html).toContain('aria-label="3rd-level spell slots: 1 of 3 remaining"');
		expect(html).toContain('aria-label="4th-level spell slots: 1 of 4 remaining"');
		expect(
			html.match(/--progress-section-color:var\(--mantine-color-red-filled\)/g) ?? [],
		).toHaveLength(2);
		expect(html).not.toContain("--progress-section-color:var(--mantine-color-yellow-filled)");
	});

	it("keeps a one-of-one spell slot in the healthy color", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotList
					characterSpells={[]}
					draftTotals={{}}
					isEditing={false}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRemoveSpell={vi.fn()}
					onRestoreSlot={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlots={[{ level: 5, total: 1, used: 0, remaining: 1 }]}
				/>
			</MantineProvider>,
		);

		expect(html).toContain('aria-label="5th-level spell slots: 1 of 1 remaining"');
		expect(html).toContain("--progress-section-color:var(--mantine-color-green-filled)");
		expect(html).not.toContain("--progress-section-color:var(--mantine-color-red-filled)");
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
					onRemoveSpell={vi.fn()}
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
					onRemoveSpell={vi.fn()}
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

	it("shows saved spell remove controls only while editing", () => {
		const spell = {
			id: "00000000-0000-4000-8000-000000000030",
			slotLevel: 3,
			spellIndex: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
			source: "spell" as const,
		};
		const viewHtml = renderToString(
			<MantineProvider>
				<SpellSlotList
					characterSpells={[spell]}
					draftTotals={{}}
					isEditing={false}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRemoveSpell={vi.fn()}
					onRestoreSlot={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlots={[{ level: 3, total: 2, used: 0, remaining: 2 }]}
				/>
			</MantineProvider>,
		);
		const editHtml = renderToString(
			<MantineProvider>
				<SpellSlotList
					characterSpells={[spell]}
					draftTotals={{}}
					isEditing={true}
					onDraftTotalChange={vi.fn()}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRemoveSpell={vi.fn()}
					onRestoreSlot={vi.fn()}
					onUseSlot={vi.fn()}
					spellSlots={[{ level: 3, total: 2, used: 0, remaining: 2 }]}
				/>
			</MantineProvider>,
		);

		expect(viewHtml).not.toContain('aria-label="Remove Magic Missile"');
		expect(editHtml).toContain('aria-label="Remove Magic Missile"');
	});
});
