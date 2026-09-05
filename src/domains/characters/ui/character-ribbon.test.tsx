import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CharacterRibbon } from "./character-ribbon.js";

describe("CharacterRibbon", () => {
	it("keeps roster navigation, identity, XP, and complete health context together", () => {
		const queryClient = new QueryClient();
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterRibbon
						character={{
							id: "00000000-0000-4000-8000-000000000001",
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
							health: { currentHp: 28, maxHp: 28, temporaryHp: 0, effectiveMaxHp: 28 },
							recentHealthChanges: [],
						}}
						onNavigate={vi.fn()}
					/>
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html.indexOf('href="/characters"')).toBeGreaterThan(-1);
		expect(html.indexOf("Mira")).toBeGreaterThan(html.indexOf("Back to characters"));
		expect(html).toContain("27,000 XP");
		expect(html).toContain("Heal");
		expect(html).toContain("Damage");
		expect(html).toContain("History (");
		expect(html).toContain('aria-expanded="false"');
	});
});
