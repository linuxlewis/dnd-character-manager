import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TreasuryPreview } from "./treasury-preview.js";

describe("TreasuryPreview", () => {
	it("renders previous and next balances, total, and server-returned change", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryPreview
					confirmLabel="Confirm spend"
					preview={{
						operation: "spend",
						previous: { cp: 5, sp: 4, gp: 3, pp: 1 },
						next: { cp: 5, sp: 9, gp: 2, pp: 1 },
						delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
						totalValue: { copper: 1_295, gp: 12.95 },
						canApply: true,
						change: { cp: 0, sp: 5, gp: 0, pp: 0 },
					}}
					returnedChange={{ cp: 0, sp: 5, gp: 0, pp: 0 }}
					onConfirm={vi.fn()}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Server-backed result preview");
		expect(readableHtml).toContain("Previous balances");
		expect(readableHtml).toContain("Next balances");
		expect(readableHtml).toContain("12.95 GP");
		expect(readableHtml).toContain("Returned change");
		expect(readableHtml).toContain("SP 5");
		expect(readableHtml).toContain("Confirm spend");
	});

	it("renders an insufficient-funds error and disables confirmation", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryPreview
					confirmLabel="Confirm spend"
					preview={{
						operation: "spend",
						previous: { cp: 5, sp: 0, gp: 0, pp: 0 },
						next: { cp: 5, sp: 0, gp: 0, pp: 0 },
						delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
						totalValue: { copper: 5, gp: 0.05 },
						canApply: false,
						error: {
							code: "INSUFFICIENT_FUNDS",
							message: "The treasury does not contain enough currency.",
							available: { copper: 5, gp: 0.05 },
							requested: { copper: 100, gp: 1 },
						},
					}}
					onConfirm={vi.fn()}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Insufficient funds");
		expect(readableHtml).toContain("The treasury does not contain enough currency.");
		expect(html).toContain('disabled=""');
	});
});
