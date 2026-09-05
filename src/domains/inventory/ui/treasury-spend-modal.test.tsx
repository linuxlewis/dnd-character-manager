import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TreasurySpendModal, validateSpendFunds } from "./treasury-spend-modal.js";

describe("TreasurySpendModal", () => {
	it("rejects an all-zero spend and accepts mixed whole-number coins", () => {
		expect(validateSpendFunds({ cp: 0, sp: 0, gp: 0, pp: 0 })).toMatchObject({
			cp: "Spend at least one coin.",
		});
		expect(validateSpendFunds({ cp: 1, sp: "", gp: 2, pp: "" })).toEqual({});
		expect(
			validateSpendFunds({ cp: 1, sp: "", gp: 2, pp: "", note: "n".repeat(501) }),
		).toMatchObject({ note: "Keep the note to 500 characters or fewer." });
	});

	it("renders four inputs, available balances, and a live normalized preview", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
					initialValues={{ cp: 0, sp: 5, gp: 0, pp: 0 }}
					mutationPending={false}
					mutationError={null}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					treasury={treasury({ cp: 5, sp: 4, gp: 3, pp: 1 })}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "").replaceAll("&gt;", ">");
		expect(readableHtml).toContain("Note (optional)");
		expect(readableHtml).toContain("Platinum pieces (PP)");
		expect(readableHtml).toContain("Gold pieces (GP)");
		expect(readableHtml).toContain("Silver pieces (SP)");
		expect(readableHtml).toContain("Copper pieces (CP)");
		expect(readableHtml).toContain("Available: 1");
		expect(readableHtml).toContain("Available: 3");
		expect(readableHtml).toContain("Available: 4");
		expect(readableHtml).toContain("Available: 5");
		expect(readableHtml).toContain("Preview");
		expect(readableHtml).not.toContain("Returned change");
		expect(readableHtml).toContain("12.95 GP");
		expect(readableHtml).toContain(">Spend<");
		expect(readableHtml).not.toContain("Preview spend");
		expect(readableHtml).not.toContain("Confirm spend");
	});

	it.each([
		["blank", undefined],
		["all-zero", { cp: 0, sp: 0, gp: 0, pp: 0 }],
	] as const)("shows a neutral preview and disables submit for %s drafts", (_label, initialValues) => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
					initialValues={initialValues}
					mutationPending={false}
					mutationError={null}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					treasury={treasury({ cp: 5, sp: 4, gp: 3, pp: 1 })}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "").replaceAll("&gt;", ">");
		expect(readableHtml).toContain("Preview");
		expect(readableHtml).toContain("Current balances");
		expect(readableHtml).toContain("After change");
		expect(readableHtml).toContain("13.45 GP -> 13.45 GP");
		expect(readableHtml).not.toContain("Insufficient funds");
		expect(readableHtml).not.toContain("Preview unavailable");
		expect(readableHtml).not.toContain("Returned change");
		expect(html).toContain('type="submit" disabled=""');
		expect(html).toContain(">Spend</span>");
	});

	it("keeps the preview visible with an honest error for an invalid draft", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
					initialValues={{ cp: 1.5, sp: 0, gp: 0, pp: 0 }}
					mutationPending={false}
					mutationError={null}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					treasury={treasury({ cp: 5, sp: 4, gp: 3, pp: 1 })}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Preview unavailable");
		expect(html).toContain("Enter a nonnegative whole number within the supported limit.");
		expect(html).not.toContain("Current balances");
		expect(html).toContain('type="submit" disabled=""');
		expect(html).toContain(">Spend</span>");
	});

	it("renders insufficient funds without exposing a second confirmation action", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
					initialValues={{ cp: 0, sp: 0, gp: 100, pp: 0 }}
					mutationPending={false}
					mutationError={null}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					treasury={treasury({ cp: 5, sp: 4, gp: 3, pp: 1 })}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Insufficient funds");
		expect(html).toContain("The treasury does not contain enough currency.");
		expect(html).toContain(">Spend<");
		expect(html).not.toContain("Confirm spend");
	});

	it("renders mutation and reconciliation failures while keeping the form", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
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

		expect(html).toContain("Spend failed");
		expect(html).toContain("Treasury reconciliation failed");
		expect(html).toContain("Spend");
	});

	it("locks all four denomination inputs while the mutation is pending", () => {
		const html = renderToString(
			<MantineProvider>
				<TreasurySpendModal
					initialValues={{ cp: 1, sp: 2, gp: 3, pp: 4 }}
					mutationPending
					mutationError={null}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					treasury={treasury({ cp: 5, sp: 4, gp: 3, pp: 1 })}
				/>
			</MantineProvider>,
		);

		expect(html.match(/<input[^>]*disabled=""/g)).toHaveLength(5);
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
