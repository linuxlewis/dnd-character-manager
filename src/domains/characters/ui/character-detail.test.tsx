import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import { CharacterDetail } from "./character-detail.js";

describe("CharacterDetail", () => {
	it("keeps escape and menu controls when a cached character refetch fails", () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const characterId = "00000000-0000-4000-8000-000000000000";
		const queryKey = apiQueryKeys.getCharacter({ characterId });
		queryClient.setQueryData(queryKey, { character: { name: "Cached character" } });
		queryClient
			.getQueryCache()
			.find({ queryKey })
			?.setState({ status: "error", error: new Error("Unavailable") });
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterDetail
						id={characterId}
						onNavigate={vi.fn()}
						renderApplicationMenu={() => <button type="button">Application menu</button>}
					/>
				</QueryClientProvider>
			</MantineProvider>,
		);
		expect(html).toContain("Character unavailable");
		expect(html).toContain('href="/characters"');
		expect(html).toContain("Application menu");
		expect(html).not.toContain("Cached character");
	});
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

		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterDetail id={characterId} onNavigate={vi.fn()} />
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).toContain("Character workspace header");
		expect(html).toContain("Spells &amp; Abilities");
		expect(html).toContain("Inventory");
		expect(html).toContain('aria-current="page"');
		expect(html).not.toContain('role="tab"');
		expect(html).toContain("Experience");
		expect(html).toContain("27,000 XP");
		expect(html).toContain("7,000 XP to level 8");
		expect(html).toContain("Health");
		expect(html).toContain("Spell slots");
		expect(html.indexOf("Experience")).toBeLessThan(html.indexOf("Health"));
		const firstTabIndex = html.indexOf('aria-label="Character sections"');
		expect(firstTabIndex).toBeGreaterThan(-1);
		expect(html.indexOf("Experience")).toBeLessThan(firstTabIndex);
		expect(html.indexOf("Health")).toBeLessThan(firstTabIndex);
		expect(firstTabIndex).toBeLessThan(html.indexOf("Spell slots"));
		expect(html).not.toContain("Personal Treasury");
		expect(html).not.toContain("Personal inventory");
		expect(html).toContain("Edit character");
		expect(html).not.toContain("Edit name");
		expect(html).not.toContain("Edit level");
	});
});
