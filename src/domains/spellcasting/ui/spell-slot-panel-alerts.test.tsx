import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpellSlotPanelAlerts } from "./spell-slot-panel-alerts.js";

describe("SpellSlotPanelAlerts", () => {
	it("renders spell slot and spell unavailable alerts independently", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotPanelAlerts spellSlotsUnavailable={true} spellsUnavailable={true} />
			</MantineProvider>,
		);
		const hiddenHtml = renderToString(
			<MantineProvider>
				<SpellSlotPanelAlerts spellSlotsUnavailable={false} spellsUnavailable={false} />
			</MantineProvider>,
		);

		expect(html).toContain("Spell slots unavailable");
		expect(html).toContain("Spells unavailable");
		expect(hiddenHtml).not.toContain("Spell slots unavailable");
		expect(hiddenHtml).not.toContain("Spells unavailable");
	});
});
