import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { type TreasuryOperationState, TreasuryPanel } from "./treasury-panel.js";
import type {
	TreasuryAddPreview,
	TreasuryAddRequest,
	TreasurySpendPreview,
	TreasurySpendRequest,
} from "./treasury-types.js";

describe("TreasuryPanel", () => {
	it("isolates treasury loading and failure states", () => {
		const loadingHtml = renderPanel({ data: undefined, isLoading: true, error: null });
		const errorHtml = renderPanel({
			data: undefined,
			isLoading: false,
			error: new Error("treasury unavailable"),
		});

		expect(toReadableText(loadingHtml)).toContain("Loading personal treasury...");
		expect(toReadableText(errorHtml)).toContain("Personal Treasury unavailable");
		expect(toReadableText(errorHtml)).toContain("Refresh the page to try again.");
	});

	it("renders a loaded treasury without the personal scope badge", () => {
		const html = renderPanel({
			data: {
				balances: { cp: 0, sp: 0, gp: 2, pp: 0 },
				totalValue: { copper: 200, gp: 2 },
			},
			isLoading: false,
			error: null,
		});

		expect(html).not.toContain("Personal Treasury</span>");
		expect(toReadableText(html)).toContain("2.00 GP");
		expect(toReadableText(html)).toContain("Add funds");
	});

	it("blocks actions until an indeterminate mutation is acknowledged", () => {
		const html = renderPanel(
			{
				data: {
					balances: { cp: 0, sp: 0, gp: 8, pp: 0 },
					totalValue: { copper: 800, gp: 8 },
				},
				isLoading: false,
				error: null,
			},
			{
				message: "The displayed balance is authoritative and must be reviewed.",
				onAcknowledge: vi.fn(),
			},
		);

		const readableHtml = toReadableText(html);
		expect(readableHtml).toContain("Treasury confirmation could not be verified");
		expect(readableHtml).toContain("The displayed balance is authoritative");
		expect(readableHtml).toContain("I reviewed the balance");
		expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Add funds/s);
		expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Spend/s);
	});
});

function renderPanel(
	query: {
		data?: {
			balances: { cp: number; sp: number; gp: number; pp: number };
			totalValue: { copper: number; gp: number };
		};
		isLoading: boolean;
		error: Error | null;
	},
	indeterminateOutcome: {
		message: string;
		onAcknowledge: () => void;
	} | null = null,
) {
	return renderToString(
		<MantineProvider>
			<TreasuryPanel
				add={addOperationState()}
				indeterminateOutcome={indeterminateOutcome}
				query={query}
				scopeLabel="Personal Treasury"
				spend={spendOperationState()}
			/>
		</MantineProvider>,
	);
}

function toReadableText(html: string) {
	return html.replaceAll("<!-- -->", "");
}

function addOperationState(): TreasuryOperationState & {
	onConfirm: (
		request: TreasuryAddRequest,
		preview: TreasuryAddPreview,
		onSuccess: () => void,
	) => void;
	onReset: () => void;
	onRetryReconciliation: () => void;
} {
	return {
		mutationPending: false,
		mutationError: null,
		reconciliationPending: false,
		reconciliationError: null,
		stalePreviewError: null,
		onConfirm: vi.fn(),
		onReset: vi.fn(),
		onRetryReconciliation: vi.fn(),
	};
}

function spendOperationState(): TreasuryOperationState & {
	onConfirm: (
		request: TreasurySpendRequest,
		preview: TreasurySpendPreview,
		onSuccess: () => void,
	) => void;
	onReset: () => void;
	onRetryReconciliation: () => void;
} {
	return {
		mutationPending: false,
		mutationError: null,
		reconciliationPending: false,
		reconciliationError: null,
		stalePreviewError: null,
		onConfirm: vi.fn(),
		onReset: vi.fn(),
		onRetryReconciliation: vi.fn(),
	};
}
