import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildCharacterAttributes } from "../config/index.js";
import { RollGroups } from "./character-roll-reference.js";

describe("RollGroups", () => {
	it("uses semantic disclosures and exposes the complete server breakdown", () => {
		const attributes = buildCharacterAttributes({
			level: 1,
			scores: {
				strength: 10,
				dexterity: 8,
				constitution: 10,
				intelligence: 10,
				wisdom: 10,
				charisma: 10,
			},
			savingThrowProficiencies: [],
			skillProficiencies: [{ key: "stealth", rank: "expertise" }],
		});
		const html = renderToString(
			<MantineProvider>
				<RollGroups
					expanded={["skill-stealth"]}
					onExpandedChange={() => undefined}
					rolls={attributes.rollReference}
				/>
			</MantineProvider>,
		);

		expect(html).toContain('data-accordion="true"');
		expect(html).toContain("Stealth");
		expect(html).toContain("Dexterity");
		expect(html).toContain("Expertise");
		expect(html).toContain("+4");
	});
});
