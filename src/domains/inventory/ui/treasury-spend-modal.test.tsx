import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TreasurySpendModal, validateSpendFunds } from "./treasury-spend-modal.js";
import type { TreasurySpendPreview } from "./treasury-types.js";

describe("TreasurySpendModal", () => {
	it("rejects nonpositive spend amounts and missing denominations", () => {
		expect(validateSpendFunds({ amount: 0, denomination: "gp" })).toMatchObject({
			amount: "Enter a positive whole number.",
		});
		expect(validateSpendFunds({ amount: 1, denomination: "" })).toMatchObject({
			denomination: "Choose a denomination.",
		});
	});

	it("renders accessible denomination and amount controls", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
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

		expect(html).toContain("Denomination");
		expect(html).toContain("Preview spend");
		expect(html).toContain("Amount");
	});

	it("renders the server-returned change in the spend confirmation preview", () => {
		const preview: TreasurySpendPreview = {
			operation: "spend",
			previous: { cp: 5, sp: 4, gp: 3, pp: 1 },
			next: { cp: 5, sp: 9, gp: 2, pp: 1 },
			totalValue: { copper: 1_295, gp: 12.95 },
			canApply: true,
			change: { cp: 0, sp: 5, gp: 0, pp: 0 },
		};
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
					confirmPending={false}
					initialValues={{ amount: 5, denomination: "sp" }}
					mutationError={null}
					onClose={vi.fn()}
					onConfirm={vi.fn()}
					onPreview={vi.fn()}
					opened
					preview={preview}
					previewError={null}
					previewPending={false}
					previewRequest={{ amount: { denomination: "sp", amount: 5 } }}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Returned change");
		expect(readableHtml).toContain("SP 5");
		expect(html).toContain("Confirm spend");
	});

	it("renders preview and confirmation-response failures without hiding the form", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
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

		expect(html).toContain("Spend preview failed");
		expect(html).toContain("Spend confirmation response unavailable");
		expect(html).toContain("Preview spend");
	});

	it("renders reconciliation recovery while keeping spend confirmation gated", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
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
		expect(html).toContain("Preview spend");
	});

	it("locks denomination and amount while confirmation or reconciliation is pending", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
					confirmPending
					initialValues={{ amount: 2, denomination: "gp" }}
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

		expect(html.match(/<input[^>]*disabled=""/g)).toHaveLength(3);
	});
});
