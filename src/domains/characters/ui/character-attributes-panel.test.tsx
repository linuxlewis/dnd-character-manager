import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { buildCharacterAttributes } from "../config/index.js";
import { CharacterAttributesPanel } from "./character-attributes-panel.js";
import { RollGroups } from "./character-roll-reference.js";

const characterId = "00000000-0000-4000-8000-000000000001";
const attributes = buildCharacterAttributes({
	level: 5,
	scores: {
		strength: 8,
		dexterity: 16,
		constitution: 10,
		intelligence: 10,
		wisdom: 14,
		charisma: 10,
	},
	savingThrowProficiencies: [{ key: "wisdom", rank: "proficient" }],
	skillProficiencies: [
		{ key: "stealth", rank: "expertise" },
		{ key: "perception", rank: "proficient" },
	],
});

describe("CharacterAttributesPanel", () => {
	it("renders compact scores, derived references, filters, and the saved roll ledger", () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(apiQueryKeys.getCharacterAttributes({ characterId }), { attributes });
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterAttributesPanel characterId={characterId} characterLevel={5} />
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).toContain("Ability scores");
		expect(html).toContain("Dexterity");
		expect(html).toContain("+3");
		expect(html).toContain("Proficiency bonus");
		expect(html).toContain("Roll reference");
		expect(html).toContain("Checks &amp; skills");
		expect(html).toContain("Stealth");
		expect(html).toContain("+9");
	});
});

describe("RollGroups", () => {
	it("renders zero and negative breakdown components when expanded", () => {
		const html = renderToString(
			<MantineProvider>
				<RollGroups
					expanded={["skill-stealth"]}
					onExpandedChange={() => undefined}
					rolls={attributes.rollReference}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Dexterity");
		expect(html).toContain("Expertise");
		expect(html).toContain("+6");
		expect(html).toContain("+0");
	});
});
