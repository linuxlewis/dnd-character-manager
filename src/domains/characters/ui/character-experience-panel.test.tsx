import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterExperiencePanel } from "./character-experience-panel.js";

describe("CharacterExperiencePanel", () => {
	it("renders formatted progress toward the next level", () => {
		const html = renderToString(
			<MantineProvider>
				<CharacterExperiencePanel
					character={{
						id: "00000000-0000-4000-8000-000000000000",
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
					}}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Experience");
		expect(html).toContain("27,000 XP");
		expect(html).toContain("7,000 XP to level 8");
	});
});
