import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellSearchModal } from "./spell-search-modal.js";

describe("SpellSearchModal", () => {
	it("renders the selected slot search form and spell results", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSearchModal
					onChangeQuery={vi.fn()}
					onClose={vi.fn()}
					onSaveSpell={vi.fn()}
					opened
					pending={false}
					query="missile"
					results={[
						{
							index: "magic-missile",
							name: "Magic Missile",
							level: 1,
							url: "/api/2014/spells/magic-missile",
							source: "spell",
						},
						{
							index: "divine-smite",
							name: "Divine Smite",
							level: 2,
							url: "/api/2014/features/divine-smite",
							source: "feature",
						},
					]}
					searched
					slotLevel={3}
					withinPortal={false}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Add spell to 3rd-level");
		expect(readableHtml).toContain("Search spells");
		expect(readableHtml).toContain("Magic Missile");
		expect(readableHtml).toContain("1st-level spell");
		expect(readableHtml).toContain("Divine Smite");
		expect(readableHtml).toContain("2nd-level feature");
	});

	it("renders non-slot search copy for cantrips and features", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSearchModal
					onChangeQuery={vi.fn()}
					onClose={vi.fn()}
					onSaveSpell={vi.fn()}
					opened
					pending={false}
					query="light"
					results={[
						{
							index: "light",
							name: "Light",
							level: 0,
							url: "/api/2014/spells/light",
							source: "spell",
						},
					]}
					searched
					slotLevel={0}
					withinPortal={false}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Add cantrip or feature");
		expect(readableHtml).toContain("Search cantrips and features");
		expect(readableHtml).toContain("Light");
		expect(readableHtml).toContain("Cantrip");
	});
});
