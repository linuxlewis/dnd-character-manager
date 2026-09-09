import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellConfigurationModal } from "./spell-configuration-modal.js";

describe("SpellConfigurationModal", () => {
	it("retains draft totals and an error inside the editor with explicit save and cancel", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellConfigurationModal
					opened
					withinPortal={false}
					onClose={vi.fn()}
					slots={[{ level: 1, total: 2, used: 1, remaining: 1 }]}
					draftTotals={{ 1: 4 }}
					onChange={vi.fn()}
					onSave={vi.fn()}
					onApplyDefaults={vi.fn()}
					pending={false}
					error={new Error("offline")}
					level={3}
				/>
			</MantineProvider>,
		);
		expect(html).toContain('value="4"');
		expect(html).toContain("Spell configuration not saved");
		expect(html).toContain("Save changes");
		expect(html).toContain("Cancel");
		expect(html).toContain("Apply class defaults");
		expect(html).toContain('type="submit"');
	});
});
