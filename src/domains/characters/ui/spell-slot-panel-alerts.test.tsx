import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellSlotPanelAlerts } from "./spell-slot-panel-alerts.js";

describe("SpellSlotPanelAlerts", () => {
	it("renders spell slot and spell unavailable alerts independently", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotPanelAlerts
					onRetrySpellSlots={vi.fn()}
					onRetrySpells={vi.fn()}
					spellSlotsUnavailable={true}
					spellsUnavailable={true}
				/>
			</MantineProvider>,
		);
		const hiddenHtml = renderToString(
			<MantineProvider>
				<SpellSlotPanelAlerts
					onRetrySpellSlots={vi.fn()}
					onRetrySpells={vi.fn()}
					spellSlotsUnavailable={false}
					spellsUnavailable={false}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Spell slots unavailable");
		expect(html).toContain("Spells unavailable");
		expect(html).toContain("Retry spell slots");
		expect(html).toContain("Retry spells");
		expect(hiddenHtml).not.toContain("Spell slots unavailable");
		expect(hiddenHtml).not.toContain("Spells unavailable");
	});

	it("keeps a mutation failure separate from GET retry controls", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotPanelAlerts
					onRetrySpellSlots={vi.fn()}
					onRetrySpells={vi.fn()}
					spellSlotActionError={{
						action: "using a spell slot",
						error: new Error("The slot could not be used."),
					}}
					spellSlotsUnavailable={false}
					spellsUnavailable={false}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Spell slot action failed");
		expect(readableHtml).toContain("using a spell slot");
		expect(readableHtml).not.toContain("Retry spell slots");
		expect(readableHtml).not.toContain("Retry spells");
	});

	it("explains a committed response-lost action without offering a blind repeat", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotPanelAlerts
					onRetrySpellSlots={vi.fn()}
					onRetrySpells={vi.fn()}
					spellSlotActionError={{
						action: "using a spell slot",
						error: new Error("response lost"),
						status: "applied",
					}}
					spellSlotsUnavailable={false}
					spellsUnavailable={false}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Spell slot action applied");
		expect(readableHtml).toContain("response was lost");
		expect(readableHtml).toContain("do not repeat this action");
		expect(readableHtml).not.toContain("Retry spell slot reconciliation");
	});

	it("blocks blind repeats and offers read-only recovery when reconciliation fails", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotPanelAlerts
					onRetryReconciliation={vi.fn()}
					onRetrySpellSlots={vi.fn()}
					onRetrySpells={vi.fn()}
					reconciliationPending={false}
					spellSlotActionError={{
						action: "using a spell slot",
						error: new Error("response lost"),
						reconciliationError: new Error("slot GET failed"),
						status: "reconciliation-failed",
					}}
					spellSlotsUnavailable={false}
					spellsUnavailable={false}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Spell slot state could not be verified");
		expect(readableHtml).toContain("Do not repeat the action until reconciliation succeeds");
		expect(readableHtml).toContain("Retry spell slot reconciliation");
		expect(readableHtml).toContain("does not repeat the action");
	});
});
