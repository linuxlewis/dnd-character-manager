import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CharacterSectionNavigation } from "./character-section-navigation.js";

describe("CharacterSectionNavigation", () => {
	it("exposes just two real links with the current destination and full accessible spell name", () => {
		const html = renderToString(
			<MantineProvider>
				<CharacterSectionNavigation characterId="a b" section="inventory" onNavigate={vi.fn()} />
			</MantineProvider>,
		);
		expect(html).toContain('href="/characters/a%20b/spells"');
		expect(html).toContain('href="/characters/a%20b/inventory"');
		expect(html).toContain('aria-label="Spells &amp; Abilities"');
		expect(html.match(/aria-current="page"/g)).toHaveLength(1);
		expect(html.match(/<a /g)).toHaveLength(2);
		expect(html).not.toContain("Rolls");
	});
});
