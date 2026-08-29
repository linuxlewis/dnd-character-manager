import { Alert, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { TreasuryAddModal } from "./treasury-add-modal.js";
import { TreasuryDisplay } from "./treasury-display.js";
import { getTreasuryErrorMessage } from "./treasury-format.js";
import { TreasurySpendModal } from "./treasury-spend-modal.js";
import type {
	TreasuryAddPreview,
	TreasuryAddRequest,
	TreasuryData,
	TreasurySpendPreview,
	TreasurySpendRequest,
} from "./treasury-types.js";

export interface TreasuryQueryState {
	data?: TreasuryData;
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
	reconciliationPending: boolean;
	reconciliationError: Error | null;
}

export interface TreasuryPanelProps {
	scopeLabel: string;
	query: TreasuryQueryState;
	add: TreasuryOperationState<TreasuryAddRequest, TreasuryAddPreview> & {
		onPreview: (request: TreasuryAddRequest) => void;
		onConfirm: (
			request: TreasuryAddRequest,
			preview: TreasuryAddPreview,
			onSuccess: () => void,
		) => void;
		onConsumePreview: () => void;
		onReset: () => void;
		onRetryReconciliation: () => void;
	};
	spend: TreasuryOperationState<TreasurySpendRequest, TreasurySpendPreview> & {
		onPreview: (request: TreasurySpendRequest) => void;
		onConfirm: (
			request: TreasurySpendRequest,
			preview: TreasurySpendPreview,
			onSuccess: () => void,
		) => void;
		onConsumePreview: () => void;
		onReset: () => void;
		onRetryReconciliation: () => void;
	};
}

type ActiveDialog = "add" | "spend" | null;

export function TreasuryPanel({ scopeLabel, query, add, spend }: TreasuryPanelProps) {
	const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
	const [dialogVersion, setDialogVersion] = useState(0);
	const treasury = query.data;
	const actionsDisabled =
		add.previewPending || add.mutationPending || spend.previewPending || spend.mutationPending;
	const reconciliationBlocked = Boolean(add.reconciliationError || spend.reconciliationError);
	const allActionsDisabled = actionsDisabled || reconciliationBlocked;

	function openDialog(dialog: Exclude<ActiveDialog, null>) {
		if (dialog === "add") add.onReset();
		if (dialog === "spend") spend.onReset();
		setDialogVersion((version) => version + 1);
		setActiveDialog(dialog);
	}

	function closeDialog() {
		if (
			activeDialog === "add" &&
			(add.previewPending || add.mutationPending || add.reconciliationError)
		)
			return;
		if (
			activeDialog === "spend" &&
			(spend.previewPending || spend.mutationPending || spend.reconciliationError)
		)
			return;
		setActiveDialog(null);
	}

	function completeDialog() {
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
					actionsDisabled={allActionsDisabled}
					onAddFunds={() => openDialog("add")}
					onSpendFunds={() => openDialog("spend")}
					scopeLabel={scopeLabel}
					treasury={treasury}
				/>
			)}

			<TreasuryAddModal
				key={`add-${dialogVersion}`}
				confirmPending={add.mutationPending}
				actionsDisabled={allActionsDisabled}
				mutationError={add.mutationError}
				onRetryReconciliation={add.onRetryReconciliation}
				onClose={closeDialog}
				onConfirm={(request, preview) => {
					add.onConsumePreview();
					add.onConfirm(request, preview, completeDialog);
				}}
				onPreview={add.onPreview}
				opened={activeDialog === "add"}
				preview={add.preview}
				previewError={add.previewError}
				previewPending={add.previewPending}
				previewRequest={add.previewRequest}
				reconciliationError={add.reconciliationError}
				reconciliationPending={add.reconciliationPending}
			/>
			<TreasurySpendModal
				key={`spend-${dialogVersion}`}
				confirmPending={spend.mutationPending}
				actionsDisabled={allActionsDisabled}
				mutationError={spend.mutationError}
				onRetryReconciliation={spend.onRetryReconciliation}
				onClose={closeDialog}
				onConfirm={(request, preview) => {
					spend.onConsumePreview();
					spend.onConfirm(request, preview, completeDialog);
				}}
				onPreview={spend.onPreview}
				opened={activeDialog === "spend"}
				preview={spend.preview}
				previewError={spend.previewError}
				previewPending={spend.previewPending}
				previewRequest={spend.previewRequest}
				reconciliationError={spend.reconciliationError}
				reconciliationPending={spend.reconciliationPending}
			/>
		</Stack>
	);
}
