import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { buildCharacterAttributes } from "../config/index.js";
import { CharacterDetail } from "./character-detail.js";

describe("CharacterDetail", () => {
	it("renders the always-visible summary with lower section tabs", () => {
		const queryClient = new QueryClient();
		const characterId = "00000000-0000-4000-8000-000000000000";
		queryClient.setQueryData(apiQueryKeys.getCharacter({ characterId }), {
			character: {
				id: characterId,
				name: "Mira",
				className: "Fighter",
				level: 7,
				experiencePoints: 27_000,
				experience: {
					level: 7,
					experiencePoints: 27_000,
					currentLevelMinimum: 23_000,
					nextLevel: 8,
					nextLevelMinimum: 34_000,
					experienceIntoLevel: 4_000,
					experienceForNextLevel: 11_000,
					experienceRemaining: 7_000,
					progressPercent: 36,
					isMaxLevel: false,
				},
				health: {
					currentHp: 28,
					maxHp: 28,
					temporaryHp: 0,
					effectiveMaxHp: 28,
				},
				recentHealthChanges: [],
			},
		});
		queryClient.setQueryData(apiQueryKeys.getCharacterAttributes({ characterId }), {
			attributes: buildCharacterAttributes({
				level: 7,
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
			}),
		});

		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterDetail id={characterId} onNavigate={vi.fn()} />
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).toContain("Back to characters");
		expect(html).toContain("Attributes &amp; Rolls");
		expect(html).toContain("Spells &amp; Abilities");
		expect(html).toContain("Inventory");
		expect(html).toContain("Experience");
		expect(html).toContain("27,000 XP");
		expect(html).toContain("7,000 XP to level 8");
		expect(html).toContain("Health");
		expect(html.indexOf("Experience")).toBeLessThan(html.indexOf("Health"));
		expect(html).toContain('aria-current="page"');
		expect(html).toContain("Strength");
		expect(html).toContain("Roll reference");
		expect(html).not.toContain("Spell slots");
		expect(html).not.toContain("Personal Treasury");
		expect(html).not.toContain("Personal inventory");
		expect(html).toContain("Edit character");
		expect(html).not.toContain("Edit name");
		expect(html).not.toContain("Edit level");
	});
});
