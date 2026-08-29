import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SpendCharacterTreasuryPreviewResponse } from "../../../generated/api-client.generated.js";
import { TreasurySpendModal, validateSpendFunds } from "./treasury-spend-modal.js";

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
		const preview: SpendCharacterTreasuryPreviewResponse = {
			treasury: {
				characterId: "00000000-0000-4000-8000-000000000001",
				balances: { cp: 5, sp: 4, gp: 3, pp: 1 },
				totalValue: { copper: 1_345, gp: 13.45 },
			},
			preview: {
				operation: "spend",
				previous: { cp: 5, sp: 4, gp: 3, pp: 1 },
				next: { cp: 5, sp: 9, gp: 2, pp: 1 },
				delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
				totalValue: { copper: 1_295, gp: 12.95 },
				canApply: true,
				change: { cp: 0, sp: 5, gp: 0, pp: 0 },
			},
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

	it("renders preview and mutation failures without hiding the form", () => {
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
		expect(html).toContain("Spend funds failed");
		expect(html).toContain("Preview spend");
	});
});
