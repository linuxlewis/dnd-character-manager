import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterHealthPanel, previewHealthAmount } from "./health-panel.js";

describe("CharacterHealthPanel", () => {
	it("renders compact health actions with collapsed recent health changes", () => {
		const queryClient = new QueryClient();
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterHealthPanel
						characterId="00000000-0000-4000-8000-000000000001"
						health={{ currentHp: 15, maxHp: 20, temporaryHp: 5, effectiveMaxHp: 25 }}
						recentHealthChanges={[
							{
								id: "00000000-0000-4000-8000-000000000002",
								previous: { currentHp: 10, maxHp: 20, temporaryHp: 0, effectiveMaxHp: 20 },
								next: { currentHp: 15, maxHp: 20, temporaryHp: 5, effectiveMaxHp: 25 },
								currentHpDelta: 5,
								maxHpDelta: 0,
								temporaryHpDelta: 5,
								createdAt: "2026-06-01T12:00:00.000Z",
							},
						]}
					/>
				</QueryClientProvider>
			</MantineProvider>,
		);

		const readableHtml = toReadableText(html);
		expect(readableHtml).toContain("HP 15/25");
		expect(readableHtml).toContain("Heal");
		expect(readableHtml).toContain("Damage");
		expect(readableHtml).toContain("Temp HP +5");
		expect(readableHtml).not.toContain("HP +5, Temp HP +5");
	});
});

function toReadableText(html: string) {
	return html.replaceAll("<!-- -->", "");
}

describe("health preview", () => {
	const health = { currentHp: 18, maxHp: 24, temporaryHp: 3, effectiveMaxHp: 27 };
	it.each([
		[5, "heal", 23],
		[99, "heal", 27],
		[5, "damage", 13],
		[99, "damage", 0],
		[0, "heal", null],
		["", "damage", null],
		[1.5, "heal", null],
	] as const)("amount %s %s previews %s", (amount, direction, result) => {
		expect(previewHealthAmount(health, amount, direction)).toBe(result);
	});
});
