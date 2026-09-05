import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CharacterInventoryHeading } from "./character-inventory-heading.js";

describe("CharacterInventoryHeading", () => {
	it("names the embedded inventory landmark and supports route focus", () => {
		const html = renderToString(
			<MantineProvider>
				<CharacterInventoryHeading embedded sectionHeadingRef={vi.fn()} />
			</MantineProvider>,
		);

		expect(html).toContain('id="character-section-inventory-heading"');
		expect(html).toContain('tabindex="-1"');
		expect(html).toContain("Personal inventory");
	});

	it("keeps the standalone heading free of the character landmark id", () => {
		const html = renderToString(
			<MantineProvider>
				<CharacterInventoryHeading embedded={false} />
			</MantineProvider>,
		);

		expect(html).not.toContain("character-section-inventory-heading");
	});
});
