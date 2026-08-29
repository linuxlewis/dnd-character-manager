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
		const loadingHtml = renderPanel({
			data: undefined,
			isLoading: true,
			error: null,
		});
		const errorHtml = renderPanel({
			data: undefined,
			isLoading: false,
			error: new Error("treasury unavailable"),
		});

		expect(toReadableText(loadingHtml)).toContain("Loading personal treasury...");
		expect(toReadableText(errorHtml)).toContain("Personal Treasury unavailable");
		expect(toReadableText(errorHtml)).toContain("Refresh the page to try again.");
	});

	it("renders a loaded treasury independently from the operation state", () => {
		const html = renderPanel({
			data: {
				balances: { cp: 0, sp: 0, gp: 2, pp: 0 },
				totalValue: { copper: 200, gp: 2 },
			},
			isLoading: false,
			error: null,
		});

		expect(html).toContain("Personal Treasury");
		expect(toReadableText(html)).toContain("2.00 GP");
		expect(toReadableText(html)).toContain("Add funds");
	});
});

function renderPanel(query: {
	data?: {
		balances: { cp: number; sp: number; gp: number; pp: number };
		totalValue: { copper: number; gp: number };
	};
	isLoading: boolean;
	error: Error | null;
}) {
	return renderToString(
		<MantineProvider>
			<TreasuryPanel
				add={addOperationState()}
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

function addOperationState(): TreasuryOperationState<TreasuryAddRequest, TreasuryAddPreview> & {
	onPreview: (request: TreasuryAddRequest) => void;
	onConfirm: (
		request: TreasuryAddRequest,
		preview: TreasuryAddPreview,
		onSuccess: () => void,
	) => void;
	onConsumePreview: () => void;
	onReset: () => void;
	onRetryReconciliation: () => void;
} {
	return {
		preview: null,
		previewRequest: null,
		previewPending: false,
		previewError: null,
		mutationPending: false,
		mutationError: null,
		reconciliationPending: false,
		reconciliationError: null,
		onPreview: vi.fn(),
		onConfirm: vi.fn(),
		onConsumePreview: vi.fn(),
		onReset: vi.fn(),
		onRetryReconciliation: vi.fn(),
	};
}

function spendOperationState(): TreasuryOperationState<
	TreasurySpendRequest,
	TreasurySpendPreview
> & {
	onPreview: (request: TreasurySpendRequest) => void;
	onConfirm: (
		request: TreasurySpendRequest,
		preview: TreasurySpendPreview,
		onSuccess: () => void,
	) => void;
	onConsumePreview: () => void;
	onReset: () => void;
	onRetryReconciliation: () => void;
} {
	return {
		preview: null,
		previewRequest: null,
		previewPending: false,
		previewError: null,
		mutationPending: false,
		mutationError: null,
		reconciliationPending: false,
		reconciliationError: null,
		onPreview: vi.fn(),
		onConfirm: vi.fn(),
		onConsumePreview: vi.fn(),
		onReset: vi.fn(),
		onRetryReconciliation: vi.fn(),
	};
}
