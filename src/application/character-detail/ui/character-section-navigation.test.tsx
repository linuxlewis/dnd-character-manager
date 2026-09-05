import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
	CharacterSectionNavigation,
	canScrollRightFromMetrics,
} from "./character-section-navigation.js";

describe("CharacterSectionNavigation", () => {
	it("exposes three real links with compact labels and full accessible names", () => {
		const html = renderToString(
			<MantineProvider>
				<CharacterSectionNavigation characterId="a b" section="inventory" onNavigate={vi.fn()} />
			</MantineProvider>,
		);
		expect(html).toContain('href="/characters/a%20b/attributes"');
		expect(html).toContain('href="/characters/a%20b/spells"');
		expect(html).toContain('href="/characters/a%20b/inventory"');
		expect(html).toContain('aria-label="Attributes &amp; Rolls"');
		expect(html).toContain('aria-label="Spells &amp; Abilities"');
		expect(html.match(/aria-current="page"/g)).toHaveLength(1);
		expect(html.match(/<a /g)).toHaveLength(3);
		expect(html).toContain("Rolls");
		expect(html).toContain("character-section-navigation-scroll");
		expect(html).toContain("character-section-navigation-affordance is-hidden");
	});

	it("only shows the overflow cue while content remains beyond the viewport", () => {
		expect(canScrollRightFromMetrics({ clientWidth: 300, scrollLeft: 0, scrollWidth: 500 })).toBe(
			true,
		);
		expect(canScrollRightFromMetrics({ clientWidth: 300, scrollLeft: 200, scrollWidth: 500 })).toBe(
			false,
		);
		expect(
			canScrollRightFromMetrics({ clientWidth: 300, scrollLeft: 199.5, scrollWidth: 500 }),
		).toBe(false);
	});
});
