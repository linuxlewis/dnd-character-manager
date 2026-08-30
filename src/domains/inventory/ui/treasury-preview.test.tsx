import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TreasuryPreview } from "./treasury-preview.js";
import type { TreasurySpendPreview } from "./treasury-types.js";

describe("TreasuryPreview", () => {
	it("renders the current balance, net effect, total, and returned change", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryPreview
					preview={
						{
							operation: "spend",
							previous: { cp: 5, sp: 4, gp: 3, pp: 1 },
							next: { cp: 5, sp: 9, gp: 2, pp: 1 },
							delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
							totalValue: { copper: 1_295, gp: 12.95 },
							canApply: true,
							change: { cp: 0, sp: 5, gp: 0, pp: 0 },
						} satisfies TreasurySpendPreview
					}
					returnedChange={{ cp: 0, sp: 5, gp: 0, pp: 0 }}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Preview");
		expect(readableHtml).toContain("Current balances");
		expect(readableHtml).toContain("After change");
		expect(readableHtml).toContain("Net change");
		expect(readableHtml).toContain("12.95 GP");
		expect(readableHtml).toContain("Returned change");
		expect(readableHtml).toContain("SP 5");
		expect(readableHtml).not.toContain("Server-backed result preview");
		expect(readableHtml).not.toContain("Confirm");
	});

	it("renders an insufficient-funds error without a confirmation control", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryPreview
					preview={
						{
							operation: "spend",
							previous: { cp: 5, sp: 0, gp: 0, pp: 0 },
							next: { cp: 5, sp: 0, gp: 0, pp: 0 },
							delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
							totalValue: { copper: 5, gp: 0.05 },
							canApply: false,
							error: {
								code: "INSUFFICIENT_FUNDS",
								message: "The treasury does not contain enough currency.",
							},
						} satisfies TreasurySpendPreview
					}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Insufficient funds");
		expect(readableHtml).toContain("The treasury does not contain enough currency.");
		expect(readableHtml).not.toContain("Confirm");
	});
});
