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

	it("renders four compact denomination inputs with a live preview and one action", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryAddModal
					initialValues={{ cp: 5, sp: 4, gp: 3, pp: 1 }}
					mutationPending={false}
					mutationError={null}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					treasury={treasury({ cp: 0, sp: 0, gp: 0, pp: 0 })}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Platinum pieces (PP)");
		expect(readableHtml).toContain("Gold pieces (GP)");
		expect(readableHtml).toContain("Silver pieces (SP)");
		expect(readableHtml).toContain("Copper pieces (CP)");
		expect(readableHtml).toContain("Preview");
		expect(readableHtml).toContain("After change");
		expect(readableHtml).toContain("13.45 GP");
		expect(readableHtml).toContain(">Add funds<");
		expect(readableHtml).not.toContain("Preview add");
		expect(readableHtml).not.toContain("Confirm add funds");
		expect(html).toContain("font-size:16px");
	});

	it("renders mutation and reconciliation failures without hiding the one-step form", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryAddModal
					mutationPending={false}
					mutationError={new Error("mutation failed")}
					onClose={vi.fn()}
					onRetryReconciliation={vi.fn()}
					onSubmit={vi.fn()}
					opened
					reconciliationError={new Error("reconciliation failed")}
					reconciliationPending={false}
					treasury={treasury({ cp: 0, sp: 0, gp: 0, pp: 0 })}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Add funds failed");
		expect(html).toContain("Treasury reconciliation failed");
		expect(html).toContain("Add funds");
		expect(html).not.toContain("Server-backed result preview");
	});

	it("locks every denomination while the mutation is pending", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasuryAddModal
					initialValues={{ cp: 1, sp: 2, gp: 3, pp: 4 }}
					mutationPending
					mutationError={null}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					treasury={treasury({ cp: 0, sp: 0, gp: 0, pp: 0 })}
				/>
			</MantineProvider>,
		);

		expect(html.match(/<input[^>]*disabled=""/g)).toHaveLength(4);
	});
});

function treasury(balances: { cp: number; sp: number; gp: number; pp: number }) {
	return {
		balances,
		totalValue: {
			copper: balances.cp + balances.sp * 10 + balances.gp * 100 + balances.pp * 1_000,
			gp: (balances.cp + balances.sp * 10 + balances.gp * 100 + balances.pp * 1_000) / 100,
		},
	};
}
