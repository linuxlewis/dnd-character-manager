import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildCharacterAttributes } from "../config/index.js";
import { CharacterAttributesEditor } from "./character-attributes-editor.js";

const attributes = buildCharacterAttributes({
	level: 3,
	scores: {
		strength: 10,
		dexterity: 10,
		constitution: 10,
		intelligence: 10,
		wisdom: 10,
		charisma: 10,
	},
	savingThrowProficiencies: [],
	skillProficiencies: [],
});

describe("CharacterAttributesEditor", () => {
	it("renders every score, save toggle, skill rank control, and live preview", () => {
		const queryClient = new QueryClient();
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterAttributesEditor
						attributes={attributes}
						characterId="00000000-0000-4000-8000-000000000001"
						characterLevel={3}
						onClose={vi.fn()}
						onSaved={vi.fn()}
						opened
					/>
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).toContain("Edit attributes");
		expect(html).toContain("Ability scores &amp; saves");
		expect(html).toContain("Skill proficiencies");
		expect(html).toContain("Strength save proficient");
		expect(html).toContain("Dexterity save proficient");
		expect(html).toContain("Constitution save proficient");
		expect(html).toContain("Intelligence save proficient");
		expect(html).toContain("Wisdom save proficient");
		expect(html).toContain("Charisma save proficient");
		expect(html.match(/data-path="skillProficiencies\.[0-9]+\.rank"/g) ?? []).toHaveLength(18);
		expect(html).toContain('value="None"');
		expect(html).toContain("Preview");
	});
});
