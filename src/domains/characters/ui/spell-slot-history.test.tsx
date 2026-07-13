import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpellSlotHistory } from "./spell-slot-history.js";

describe("SpellSlotHistory", () => {
	it("renders recent spell slot changes only when opened", () => {
		const closedHtml = renderToString(
			<MantineProvider>
				<SpellSlotHistory
					changes={[
						{
							id: "00000000-0000-4000-8000-000000000040",
							action: "used",
							level: 1,
							previous: { total: 2, used: 0, remaining: 2 },
							next: { total: 2, used: 1, remaining: 1 },
							totalDelta: 0,
							usedDelta: 1,
							createdAt: "2026-07-01T12:00:00.000Z",
						},
					]}
					opened={false}
				/>
			</MantineProvider>,
		);
		const openedHtml = renderToString(
			<MantineProvider>
				<SpellSlotHistory
					changes={[
						{
							id: "00000000-0000-4000-8000-000000000040",
							action: "used",
							level: 1,
							previous: { total: 2, used: 0, remaining: 2 },
							next: { total: 2, used: 1, remaining: 1 },
							totalDelta: 0,
							usedDelta: 1,
							createdAt: "2026-07-01T12:00:00.000Z",
						},
					]}
					opened={true}
				/>
			</MantineProvider>,
		);

		expect(closedHtml).not.toContain("Used 1st-level slot");
		expect(openedHtml).toContain("Used 1st-level slot");
	});
});
