import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellSlotEditActions } from "./spell-slot-edit-actions.js";

describe("SpellSlotEditActions", () => {
	it("renders spell edit actions only while editing", () => {
		const hiddenHtml = renderToString(
			<MantineProvider>
				<SpellSlotEditActions
					defaultsPending={false}
					disabled={false}
					isEditing={false}
					onApplyDefaults={vi.fn()}
					onSaveConfiguration={vi.fn()}
					updatePending={false}
				/>
			</MantineProvider>,
		);
		const visibleHtml = renderToString(
			<MantineProvider>
				<SpellSlotEditActions
					defaultsPending={false}
					disabled={true}
					isEditing={true}
					onApplyDefaults={vi.fn()}
					onSaveConfiguration={vi.fn()}
					updatePending={false}
				/>
			</MantineProvider>,
		);

		expect(hiddenHtml).not.toContain("Apply class defaults");
		expect(visibleHtml).toContain("Apply class defaults");
		expect(visibleHtml).toContain("Apply changes");
		expect(visibleHtml).toContain("disabled");
	});
});
