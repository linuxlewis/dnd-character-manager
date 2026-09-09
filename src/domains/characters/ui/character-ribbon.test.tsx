import { MantineProvider } from "@mantine/core";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CharacterRibbon } from "./character-ribbon.js";

vi.mock("./character-editor.js", () => ({ CharacterEditor: () => null }));
vi.mock("./character-experience-panel.js", () => ({ CharacterExperiencePanel: () => null }));

describe("CharacterRibbon", () => {
	it("provides the roster link and app-owned menu beside character identity", () => {
		const character = {
			id: "mira",
			name: "Mira",
			className: "Wizard",
			level: 3,
		} as ComponentProps<typeof CharacterRibbon>["character"];
		const html = renderToString(
			<MantineProvider>
				<CharacterRibbon
					character={character}
					onNavigate={vi.fn()}
					renderApplicationMenu={() => <button type="button">Application menu</button>}
				/>
			</MantineProvider>,
		);
		expect(html).toContain('href="/characters"');
		expect(html).toContain("Mira");
		expect(html).toContain("Wizard");
		expect(html).toContain("Application menu");
	});
});
