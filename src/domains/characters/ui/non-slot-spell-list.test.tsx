import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NonSlotSpellList } from "./non-slot-spell-list.js";

describe("NonSlotSpellList", () => {
	it("renders cantrips and features without spell slot controls", () => {
		const html = renderToString(
			<MantineProvider>
				<NonSlotSpellList
					characterSpells={[
						{
							id: "00000000-0000-4000-8000-000000000031",
							slotLevel: 0,
							spellIndex: "light",
							name: "Light",
							level: 0,
							url: "/api/2014/spells/light",
							source: "spell",
						},
						{
							id: "00000000-0000-4000-8000-000000000032",
							slotLevel: 0,
							spellIndex: "lay-on-hands",
							name: "Lay on Hands",
							level: 1,
							url: "/api/2014/features/lay-on-hands",
							source: "feature",
						},
					]}
					isEditing={false}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRemoveSpell={vi.fn()}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Cantrips &amp; features");
		expect(html).toContain('aria-label="Add cantrip or feature"');
		expect(html).toContain('aria-label="View Light details"');
		expect(html).toContain('aria-label="View Lay on Hands details"');
		expect(readableHtml).toContain("Light");
		expect(readableHtml).toContain("Cantrip");
		expect(readableHtml).toContain("Lay on Hands");
		expect(readableHtml).toContain("1st-level feature");
		expect(readableHtml).not.toContain("Use");
		expect(readableHtml).not.toContain("Restore");
		expect(html).not.toContain('aria-label="Remove Light"');
	});

	it("shows saved cantrip and feature remove controls while editing", () => {
		const html = renderToString(
			<MantineProvider>
				<NonSlotSpellList
					characterSpells={[
						{
							id: "00000000-0000-4000-8000-000000000031",
							slotLevel: 0,
							spellIndex: "light",
							name: "Light",
							level: 0,
							url: "/api/2024/spells/light",
							source: "spell",
						},
						{
							id: "00000000-0000-4000-8000-000000000032",
							slotLevel: 0,
							spellIndex: "lay-on-hands",
							name: "Lay on Hands",
							level: 1,
							url: "/api/2014/features/lay-on-hands",
							source: "feature",
						},
					]}
					isEditing={true}
					onOpenSpellDetails={vi.fn()}
					onOpenSpellSearch={vi.fn()}
					onRemoveSpell={vi.fn()}
				/>
			</MantineProvider>,
		);

		expect(html).toContain('aria-label="Remove Light"');
		expect(html).toContain('aria-label="Remove Lay on Hands"');
	});
});
