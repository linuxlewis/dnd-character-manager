import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TreasuryDisplay } from "./treasury-display.js";

describe("TreasuryDisplay", () => {
	it("renders the personal scope, colored denomination cards, and total value", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryDisplay
					onAddFunds={vi.fn()}
					onSpendFunds={vi.fn()}
					scopeLabel="Personal Treasury"
					treasury={treasury({ cp: 5, sp: 4, gp: 3, pp: 1 })}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Personal Treasury");
		expect(readableHtml).toContain("Add funds");
		expect(readableHtml).toContain("Spend");
		expect(readableHtml).toContain("Platinum pieces");
		expect(readableHtml).toContain("1");
		expect(readableHtml).toContain("13.45 GP");
	});

	it("renders zero balances as a valid empty treasury", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryDisplay
					onAddFunds={vi.fn()}
					onSpendFunds={vi.fn()}
					scopeLabel="Personal Treasury"
					treasury={treasury({ cp: 0, sp: 0, gp: 0, pp: 0 })}
				/>
			</MantineProvider>,
		);

		expect(html.replaceAll("<!-- -->", "")).toContain("0.00 GP");
	});
});

function treasury(balances: { cp: number; sp: number; gp: number; pp: number }) {
	return {
		characterId: "00000000-0000-4000-8000-000000000001",
		balances,
		totalValue: {
			copper: balances.cp + balances.sp * 10 + balances.gp * 100 + balances.pp * 1_000,
			gp: (balances.cp + balances.sp * 10 + balances.gp * 100 + balances.pp * 1_000) / 100,
		},
	};
}
