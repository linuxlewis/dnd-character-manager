import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellDetailsModal } from "./spell-details-modal.js";

describe("SpellDetailsModal", () => {
	it("renders spell description, higher-level text, and metadata", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellDetailsModal
					details={{
						id: "00000000-0000-4000-8000-000000000030",
						slotLevel: 3,
						spellIndex: "magic-missile",
						name: "Magic Missile",
						level: 1,
						url: "/api/2014/spells/magic-missile",
						source: "spell",
						desc: ["You create three glowing darts of magical force."],
						higherLevel: ["One more dart is created for each slot level above 1st."],
						metadata: [{ label: "Range", value: "120 feet" }],
					}}
					onClose={vi.fn()}
					opened={true}
					pending={false}
					withinPortal={false}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Magic Missile");
		expect(readableHtml).toContain("Spell 1st-level");
		expect(readableHtml).toContain("You create three glowing darts of magical force.");
		expect(readableHtml).toContain("At Higher Levels");
		expect(readableHtml).toContain("One more dart is created for each slot level above 1st.");
		expect(readableHtml).toContain("Range");
		expect(readableHtml).toContain("120 feet");
	});

	it("renders a detail-specific retry", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellDetailsModal
					details={null}
					error={new Error("Details failed.")}
					onClose={vi.fn()}
					onRetry={vi.fn()}
					opened
					pending={false}
					withinPortal={false}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Spell details unavailable");
		expect(readableHtml).toContain("Retry spell details");
	});
});
