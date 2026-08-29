import { Alert, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type {
	AddCharacterTreasuryPreviewResponse,
	AddCharacterTreasuryRequest,
	CharacterTreasuryResponse,
	SpendCharacterTreasuryPreviewResponse,
	SpendCharacterTreasuryRequest,
} from "../../../generated/api-client.generated.js";
import { TreasuryAddModal } from "./treasury-add-modal.js";
import { TreasuryDisplay } from "./treasury-display.js";
import { getTreasuryErrorMessage } from "./treasury-format.js";
import { TreasurySpendModal } from "./treasury-spend-modal.js";

interface TreasuryQueryState {
	data?: CharacterTreasuryResponse;
	isLoading: boolean;
	error: Error | null;
}

export interface TreasuryOperationState<Request, PreviewResponse> {
	preview: PreviewResponse | null;
	previewRequest: Request | null;
	previewPending: boolean;
	previewError: Error | null;
	mutationPending: boolean;
	mutationError: Error | null;
}

export interface TreasuryPanelProps {
	scopeLabel: string;
	query: TreasuryQueryState;
	add: TreasuryOperationState<AddCharacterTreasuryRequest, AddCharacterTreasuryPreviewResponse> & {
		onPreview: (request: AddCharacterTreasuryRequest) => void;
		onConfirm: (request: AddCharacterTreasuryRequest, onSuccess: () => void) => void;
		onReset: () => void;
	};
	spend: TreasuryOperationState<
		SpendCharacterTreasuryRequest,
		SpendCharacterTreasuryPreviewResponse
	> & {
		onPreview: (request: SpendCharacterTreasuryRequest) => void;
		onConfirm: (request: SpendCharacterTreasuryRequest, onSuccess: () => void) => void;
		onReset: () => void;
	};
}

type ActiveDialog = "add" | "spend" | null;

export function TreasuryPanel({ scopeLabel, query, add, spend }: TreasuryPanelProps) {
	const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
	const [dialogVersion, setDialogVersion] = useState(0);
	const treasury = query.data?.treasury;

	function openDialog(dialog: Exclude<ActiveDialog, null>) {
		if (dialog === "add") add.onReset();
		if (dialog === "spend") spend.onReset();
		setDialogVersion((version) => version + 1);
		setActiveDialog(dialog);
	}

	function closeDialog() {
		if (activeDialog === "add" && (add.previewPending || add.mutationPending)) return;
		if (activeDialog === "spend" && (spend.previewPending || spend.mutationPending)) return;
		setActiveDialog(null);
	}

	return (
		<Stack gap="md">
			{query.isLoading && (
				<Paper withBorder p="sm">
					<Text c="dimmed">Loading {scopeLabel.toLowerCase()}...</Text>
				</Paper>
			)}
			{query.error && (
				<Alert color="red" title={`${scopeLabel} unavailable`} variant="light">
					{getTreasuryErrorMessage(query.error, "Refresh the page to try again.")}
				</Alert>
			)}
			{treasury && (
				<TreasuryDisplay
					onAddFunds={() => openDialog("add")}
					onSpendFunds={() => openDialog("spend")}
					scopeLabel={scopeLabel}
					treasury={treasury}
				/>
			)}

			<TreasuryAddModal
				key={`add-${dialogVersion}`}
				confirmPending={add.mutationPending}
				mutationError={add.mutationError}
				onClose={closeDialog}
				onConfirm={(request) => add.onConfirm(request, closeDialog)}
				onPreview={add.onPreview}
				opened={activeDialog === "add"}
				preview={add.preview}
				previewError={add.previewError}
				previewPending={add.previewPending}
				previewRequest={add.previewRequest}
			/>
			<TreasurySpendModal
				key={`spend-${dialogVersion}`}
				confirmPending={spend.mutationPending}
				mutationError={spend.mutationError}
				onClose={closeDialog}
				onConfirm={(request) => spend.onConfirm(request, closeDialog)}
				onPreview={spend.onPreview}
				opened={activeDialog === "spend"}
				preview={spend.preview}
				previewError={spend.previewError}
				previewPending={spend.previewPending}
				previewRequest={spend.previewRequest}
			/>
		</Stack>
	);
}
