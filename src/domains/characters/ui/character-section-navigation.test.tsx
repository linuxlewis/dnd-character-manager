import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
	CharacterSectionNavigation,
	canScrollRightFromMetrics,
} from "./character-section-navigation.js";

describe("CharacterSectionNavigation", () => {
	it("renders real links for all destinations with accessible active state", () => {
		const html = renderToString(
			<MantineProvider>
				<CharacterSectionNavigation
					activeSection="inventory"
					characterId="abc"
					onNavigate={vi.fn()}
				/>
			</MantineProvider>,
		);

		expect(html).toContain('href="/characters/abc"');
		expect(html).toContain('href="/characters/abc/spells"');
		expect(html).toContain('href="/characters/abc/inventory"');
		expect(html).toContain('aria-current="page"');
		expect(html).toContain("Attributes &amp; Rolls");
		expect(html).toContain("Spells &amp; Abilities");
		expect(html).toContain("character-section-navigation-scroll");
		expect(html).not.toContain("character-section-navigation-affordance");
	});

	it("only reports a right cue while content remains beyond the viewport", () => {
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
