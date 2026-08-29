import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TreasuryAddModal, validateAddFunds } from "./treasury-add-modal.js";

describe("TreasuryAddModal", () => {
	it("rejects an all-zero add and accepts mixed whole-number funds", () => {
		expect(validateAddFunds({ cp: 0, sp: 0, gp: 0, pp: 0 })).toMatchObject({
			cp: "Add at least one coin.",
		});
		expect(validateAddFunds({ cp: 1, sp: "", gp: 2, pp: "" })).toEqual({});
	});

	it("renders accessible denomination inputs and a preview action", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryAddModal
					confirmPending={false}
					mutationError={null}
					onClose={vi.fn()}
					onConfirm={vi.fn()}
					onPreview={vi.fn()}
					opened
					preview={null}
					previewError={null}
					previewPending={false}
					previewRequest={null}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Platinum pieces (PP)");
		expect(html).toContain("Preview add");
		expect(html).toContain("font-size:16px");
	});

	it("renders preview and mutation failures without hiding the form", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryAddModal
					confirmPending={false}
					mutationError={new Error("mutation failed")}
					onClose={vi.fn()}
					onConfirm={vi.fn()}
					onPreview={vi.fn()}
					opened
					preview={null}
					previewError={new Error("preview failed")}
					previewPending={false}
					previewRequest={null}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Add preview failed");
		expect(html).toContain("Add funds failed");
		expect(html).toContain("Preview add");
	});

	it("renders reconciliation recovery without exposing confirmation controls", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryAddModal
					confirmPending={false}
					mutationError={null}
					onClose={vi.fn()}
					onConfirm={vi.fn()}
					onPreview={vi.fn()}
					onRetryReconciliation={vi.fn()}
					opened
					preview={null}
					previewError={null}
					previewPending={false}
					previewRequest={null}
					reconciliationError={new Error("reconciliation failed")}
					reconciliationPending={false}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Treasury reconciliation failed");
		expect(html).toContain("Retry treasury reconciliation");
		expect(html).toContain("Preview add");
	});
});
