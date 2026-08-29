import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
	AddCharacterTreasuryPreviewResponse,
	AddCharacterTreasuryRequest,
	SpendCharacterTreasuryPreviewResponse,
	SpendCharacterTreasuryRequest,
} from "../../../generated/api-client.generated.js";
import { type TreasuryOperationState, TreasuryPanel } from "./treasury-panel.js";

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
				treasury: {
					characterId: "00000000-0000-4000-8000-000000000001",
					balances: { cp: 0, sp: 0, gp: 2, pp: 0 },
					totalValue: { copper: 200, gp: 2 },
				},
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
		treasury: {
			characterId: string;
			balances: { cp: number; sp: number; gp: number; pp: number };
			totalValue: { copper: number; gp: number };
		};
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

function addOperationState(): TreasuryOperationState<
	AddCharacterTreasuryRequest,
	AddCharacterTreasuryPreviewResponse
> & {
	onPreview: (request: AddCharacterTreasuryRequest) => void;
	onConfirm: (request: AddCharacterTreasuryRequest, onSuccess: () => void) => void;
	onReset: () => void;
} {
	return {
		preview: null,
		previewRequest: null,
		previewPending: false,
		previewError: null,
		mutationPending: false,
		mutationError: null,
		onPreview: vi.fn(),
		onConfirm: vi.fn(),
		onReset: vi.fn(),
	};
}

function spendOperationState(): TreasuryOperationState<
	SpendCharacterTreasuryRequest,
	SpendCharacterTreasuryPreviewResponse
> & {
	onPreview: (request: SpendCharacterTreasuryRequest) => void;
	onConfirm: (request: SpendCharacterTreasuryRequest, onSuccess: () => void) => void;
	onReset: () => void;
} {
	return {
		preview: null,
		previewRequest: null,
		previewPending: false,
		previewError: null,
		mutationPending: false,
		mutationError: null,
		onPreview: vi.fn(),
		onConfirm: vi.fn(),
		onReset: vi.fn(),
	};
}
